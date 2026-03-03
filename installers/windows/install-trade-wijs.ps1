param(
    [string]$ProjectPath,
    [string]$TaskName = "TradeWijsContainerStartup"
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-ProjectPath {
    param(
        [string]$ExplicitProjectPath
    )

    if ($ExplicitProjectPath) {
        try {
            return (Resolve-Path -LiteralPath $ExplicitProjectPath).Path
        }
        catch {
            return $null
        }
    }

    $candidates = @(
        $PSScriptRoot,
        (Join-Path $PSScriptRoot "..\.."),
        (Get-Location).Path
    )

    foreach ($candidate in $candidates) {
        if (-not $candidate) {
            continue
        }

        try {
            $resolvedCandidate = (Resolve-Path -LiteralPath $candidate).Path
            if (Test-Path (Join-Path $resolvedCandidate "docker-compose.yml")) {
                return $resolvedCandidate
            }
        }
        catch {
            continue
        }
    }

    return $null
}

function Resolve-StartupScriptPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $candidatePaths = @(
        (Join-Path $ProjectRoot "installers\windows\startup-trade-wijs.ps1"),
        (Join-Path $ProjectRoot "startup-trade-wijs.ps1")
    )

    foreach ($candidatePath in $candidatePaths) {
        if (Test-Path $candidatePath) {
            return $candidatePath
        }
    }

    return $null
}

function New-StartupTaskCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartupScriptPath
    )

    $defaultTaskInnerCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $StartupScriptPath
    $defaultTaskCommand = '"{0}"' -f $defaultTaskInnerCommand
    if ($defaultTaskCommand.Length -le 261) {
        return $defaultTaskCommand
    }

    $wrapperDirectory = Join-Path $env:ProgramData "TradeWijs"
    if (-not (Test-Path $wrapperDirectory)) {
        New-Item -Path $wrapperDirectory -ItemType Directory -Force | Out-Null
    }

    $wrapperScriptPath = Join-Path $wrapperDirectory "startup-trade-wijs-wrapper.ps1"
    $wrapperScriptContent = @(
        '$ErrorActionPreference = "Stop"'
        ('& "{0}"' -f $StartupScriptPath)
        'exit $LASTEXITCODE'
    ) -join "`r`n"

    Set-Content -Path $wrapperScriptPath -Value $wrapperScriptContent -Encoding UTF8

    $wrapperTaskInnerCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $wrapperScriptPath
    return '"{0}"' -f $wrapperTaskInnerCommand
}

function Invoke-SchtasksSafely {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $stdoutPath = [System.IO.Path]::GetTempFileName()
    $stderrPath = [System.IO.Path]::GetTempFileName()

    try {
        $process = Start-Process -FilePath "schtasks.exe" -ArgumentList $Arguments -Wait -NoNewWindow -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

        $stdoutLines = @()
        if (Test-Path $stdoutPath) {
            $stdoutLines = Get-Content -Path $stdoutPath -ErrorAction SilentlyContinue
        }

        $stderrLines = @()
        if (Test-Path $stderrPath) {
            $stderrLines = Get-Content -Path $stderrPath -ErrorAction SilentlyContinue
        }

        $commandOutput = @($stdoutLines + $stderrLines)

        return @{
            ExitCode = $process.ExitCode
            Output = @($commandOutput)
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutPath -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrPath -ErrorAction SilentlyContinue
    }
}

function Register-StartupFolderEntry {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartupScriptPath
    )

    $startupDirectory = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
    if (-not (Test-Path $startupDirectory)) {
        New-Item -Path $startupDirectory -ItemType Directory -Force | Out-Null
    }

    $launcherPath = Join-Path $startupDirectory "TradeWijs-Startup.cmd"
    $launcherContent = @(
        '@echo off'
        ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $StartupScriptPath)
    ) -join "`r`n"

    Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII
    return $launcherPath
}

function Resolve-DockerExecutable {
    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCommand) {
        return $dockerCommand.Source
    }

    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $combinedPath = @($machinePath, $userPath) -join ';'
    if ($combinedPath) {
        $env:Path = $combinedPath
        $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
        if ($dockerCommand) {
            return $dockerCommand.Source
        }
    }

    $candidatePaths = @(
        (Join-Path ${env:ProgramFiles} "Docker\Docker\resources\bin\docker.exe"),
        (Join-Path ${env:ProgramFiles} "Docker\Docker\resources\bin\com.docker.cli.exe")
    )

    foreach ($candidate in $candidatePaths) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Resolve-PodmanExecutable {
    $podmanCommand = Get-Command podman -ErrorAction SilentlyContinue
    if ($podmanCommand) {
        return $podmanCommand.Source
    }

    return $null
}

function Resolve-ContainerRuntime {
    $dockerExecutable = Resolve-DockerExecutable
    if ($dockerExecutable) {
        return @{
            Name = "docker"
            Executable = $dockerExecutable
        }
    }

    $podmanExecutable = Resolve-PodmanExecutable
    if ($podmanExecutable) {
        return @{
            Name = "podman"
            Executable = $podmanExecutable
        }
    }

    return $null
}

function Remove-ExistingTradeWijsContainer {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Runtime
    )

    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue)
    if ($hasNativePref) {
        $previousNativePref = $Global:PSNativeCommandUseErrorActionPreference
        $Global:PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        $containerName = "trade-wijs"
        $containerNames = & $Runtime.Executable ps -a --format "{{.Names}}" 2>$null
        if ($LASTEXITCODE -ne 0) {
            return
        }

        $hasExistingContainer = @($containerNames | ForEach-Object { $_.ToString().Trim() }) -contains $containerName
        if (-not $hasExistingContainer) {
            return
        }

        Write-Host "Removing existing container '$containerName'..." -ForegroundColor Yellow
        & $Runtime.Executable rm -f $containerName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to remove existing container '$containerName'." -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
    finally {
        if ($hasNativePref) {
            $Global:PSNativeCommandUseErrorActionPreference = $previousNativePref
        }
    }
}

function Invoke-ComposeUp {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$ComposeRunner,
        [switch]$WithBuild
    )

    $composeArguments = @($ComposeRunner.PrefixArgs + @("up", "-d"))
    if ($WithBuild) {
        $composeArguments += "--build"
    }

    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue)
    if ($hasNativePref) {
        $previousNativePref = $Global:PSNativeCommandUseErrorActionPreference
        $Global:PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        $commandOutput = & $ComposeRunner.Executable @composeArguments 2>&1
        $commandExitCode = $LASTEXITCODE
        if ($commandOutput) {
            $commandOutput | ForEach-Object { Write-Host $_ }
        }

        return @{
            ExitCode = $commandExitCode
            Output = @($commandOutput)
        }
    }
    finally {
        if ($hasNativePref) {
            $Global:PSNativeCommandUseErrorActionPreference = $previousNativePref
        }
    }
}

function Test-PythonModuleAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PythonExecutable,
        [Parameter(Mandatory = $true)]
        [string]$ModuleName
    )

    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue)
    if ($hasNativePref) {
        $previousNativePref = $Global:PSNativeCommandUseErrorActionPreference
        $Global:PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        & $PythonExecutable -c "import $ModuleName" *> $null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
    finally {
        if ($hasNativePref) {
            $Global:PSNativeCommandUseErrorActionPreference = $previousNativePref
        }
    }
}

function Get-PodmanComposeVenvRunner {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,
        [switch]$InstallIfMissing
    )

    $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        return $null
    }

    $isPodmanComposeAvailable = Test-PythonModuleAvailable -PythonExecutable $venvPython -ModuleName "podman_compose"
    if (-not $isPodmanComposeAvailable -and $InstallIfMissing) {
        Write-Host "Installing podman-compose into .venv..." -ForegroundColor Cyan
        & $venvPython -m pip install podman-compose
        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        $isPodmanComposeAvailable = Test-PythonModuleAvailable -PythonExecutable $venvPython -ModuleName "podman_compose"
        if (-not $isPodmanComposeAvailable) {
            Write-Host "podman-compose could not be imported from .venv after installation attempt." -ForegroundColor Yellow
            return $null
        }
    }

    if (-not $isPodmanComposeAvailable) {
        return $null
    }

    return @{
        Name = "podman-compose (.venv)"
        Executable = $venvPython
        PrefixArgs = @("-m", "podman_compose")
    }
}

function Resolve-ComposeRunner {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Runtime,
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    if ($Runtime.Name -eq "podman") {
        $venvRunner = Get-PodmanComposeVenvRunner -ProjectRoot $ProjectRoot -InstallIfMissing
        if ($venvRunner) {
            return $venvRunner
        }
    }

    try {
        & $Runtime.Executable compose version | Out-Null
        return @{
            Name = "$($Runtime.Name) compose"
            Executable = $Runtime.Executable
            PrefixArgs = @("compose")
        }
    }
    catch {
        if ($Runtime.Name -eq "podman") {
            return Get-PodmanComposeVenvRunner -ProjectRoot $ProjectRoot -InstallIfMissing
        }

        return $null
    }
}

if (-not (Test-IsAdministrator)) {
    Write-Host "Run this script as Administrator (required for startup task on system boot)." -ForegroundColor Red
    exit 1
}

$ProjectPath = Resolve-ProjectPath -ExplicitProjectPath $ProjectPath
if (-not $ProjectPath) {
    Write-Host "Could not resolve project directory containing docker-compose.yml." -ForegroundColor Red
    Write-Host "Run from the project folder or pass -ProjectPath \"C:\path\to\trade-wijs\"." -ForegroundColor Yellow
    exit 1
}

$containerRuntime = Resolve-ContainerRuntime
if (-not $containerRuntime) {
    Write-Host "No supported container runtime found (Docker or Podman)." -ForegroundColor Red
    Write-Host "Install/start Docker Desktop or Podman and ensure the CLI is available in PATH." -ForegroundColor Yellow
    exit 1
}

Write-Host "Selected container runtime: $($containerRuntime.Name) ($($containerRuntime.Executable))" -ForegroundColor Cyan

Set-Location -LiteralPath $ProjectPath

$helpersPath = Join-Path $ProjectPath "ps-helpers.ps1"
if (-not (Test-Path $helpersPath)) {
    Write-Host "Missing helper script: $helpersPath" -ForegroundColor Red
    exit 1
}

. $helpersPath
Add-UserPythonPath

if (-not (Ensure-VenvRequirements -ProjectRoot $ProjectPath)) {
    exit 1
}

$composeRunner = Resolve-ComposeRunner -Runtime $containerRuntime -ProjectRoot $ProjectPath
if (-not $composeRunner) {
    Write-Host "Compose provider is missing for '$($containerRuntime.Name)'." -ForegroundColor Red
    if ($containerRuntime.Name -eq "docker") {
        Write-Host "Install Docker Desktop or the docker compose plugin." -ForegroundColor Yellow
    }
    else {
        Write-Host "Install podman-compose or ensure .venv can install it via pip." -ForegroundColor Yellow
    }
    exit 1
}

Remove-ExistingTradeWijsContainer -Runtime $containerRuntime

Write-Host "Building and starting containers with $($composeRunner.Name)..." -ForegroundColor Cyan
$composeResult = Invoke-ComposeUp -ComposeRunner $composeRunner -WithBuild
if ($composeResult.ExitCode -ne 0) {
    $composeOutputText = ($composeResult.Output | ForEach-Object { $_.ToString() }) -join "`n"
    $isKnownPodmanComposeCleanupError = $composeRunner.Name -like "podman-compose*" -and ($composeOutputText -match "error deleting build container|identifier is not a container")

    if ($isKnownPodmanComposeCleanupError) {
        Write-Host "Detected Podman cleanup build error; retrying without --build..." -ForegroundColor Yellow
        $composeResult = Invoke-ComposeUp -ComposeRunner $composeRunner
    }
}

if ($composeResult.ExitCode -ne 0) {
    Write-Host "Failed to build/start containers." -ForegroundColor Red
    exit $composeResult.ExitCode
}

$startupScriptPath = Resolve-StartupScriptPath -ProjectRoot $ProjectPath
if (-not $startupScriptPath) {
    Write-Host "Missing startup script in project directory." -ForegroundColor Red
    Write-Host "Expected one of:" -ForegroundColor Yellow
    Write-Host " - $(Join-Path $ProjectPath 'installers\windows\startup-trade-wijs.ps1')" -ForegroundColor Yellow
    Write-Host " - $(Join-Path $ProjectPath 'startup-trade-wijs.ps1')" -ForegroundColor Yellow
    exit 1
}

$taskCommand = New-StartupTaskCommand -StartupScriptPath $startupScriptPath

$registeredTaskName = $TaskName
$startupModeMessage = "Containers are running and will auto-start after reboot."

$systemTaskResult = Invoke-SchtasksSafely -Arguments @("/Create", "/TN", $TaskName, "/SC", "ONSTART", "/RU", "SYSTEM", "/RL", "HIGHEST", "/TR", $taskCommand, "/F")
if ($systemTaskResult.ExitCode -ne 0) {
    $systemTaskOutput = $systemTaskResult.Output
    $systemTaskOutputText = ($systemTaskOutput | ForEach-Object { $_.ToString() }) -join "`n"

    if ($systemTaskOutputText -match "Access is denied") {
        Write-Host "No permission to create SYSTEM startup task. Falling back to user logon task..." -ForegroundColor Yellow

        $registeredTaskName = "$TaskName-User"
        $userTaskResult = Invoke-SchtasksSafely -Arguments @("/Create", "/TN", $registeredTaskName, "/SC", "ONLOGON", "/RU", $env:USERNAME, "/RL", "LIMITED", "/TR", $taskCommand, "/F")
        if ($userTaskResult.ExitCode -ne 0) {
            $userTaskOutput = $userTaskResult.Output
            $userTaskOutputText = ($userTaskOutput | ForEach-Object { $_.ToString() }) -join "`n"

            if ($userTaskOutputText -match "Access is denied") {
                Write-Host "No permission to create user startup task. Falling back to Startup folder entry..." -ForegroundColor Yellow
                $launcherPath = Register-StartupFolderEntry -StartupScriptPath $startupScriptPath
                $registeredTaskName = "StartupFolder"
                $startupModeMessage = "Containers are running and will auto-start after user login (Startup folder)."
                Write-Host "Registered startup launcher: $launcherPath" -ForegroundColor Green
            }
            else {
                Write-Host "Failed to register fallback startup task '$registeredTaskName'." -ForegroundColor Red
                $userTaskOutput | ForEach-Object { Write-Host $_ -ForegroundColor Red }
                exit $userTaskResult.ExitCode
            }
        }
        elseif ($registeredTaskName -ne "StartupFolder") {
            $startupModeMessage = "Containers are running and will auto-start after user login."
        }
    }
    else {
        Write-Host "Failed to register startup task '$TaskName'." -ForegroundColor Red
        $systemTaskOutput | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        exit $systemTaskResult.ExitCode
    }
}

Write-Host "Installer completed." -ForegroundColor Green
Write-Host $startupModeMessage -ForegroundColor Green
Write-Host "Registered startup task: $registeredTaskName" -ForegroundColor Green
Write-Host "Open: http://localhost:3175" -ForegroundColor Green
