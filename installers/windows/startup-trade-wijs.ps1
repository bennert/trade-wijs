param(
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"

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

    $candidatePaths = @(
        $PSScriptRoot,
        (Join-Path $PSScriptRoot "..\.."),
        (Get-Location).Path
    )

    foreach ($candidatePath in $candidatePaths) {
        if (-not $candidatePath) {
            continue
        }

        try {
            $resolvedCandidate = (Resolve-Path -LiteralPath $candidatePath).Path
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
        [string]$ProjectRoot
    )

    $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        return $null
    }

    $isPodmanComposeAvailable = Test-PythonModuleAvailable -PythonExecutable $venvPython -ModuleName "podman_compose"
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
        $venvRunner = Get-PodmanComposeVenvRunner -ProjectRoot $ProjectRoot
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
            return Get-PodmanComposeVenvRunner -ProjectRoot $ProjectRoot
        }

        return $null
    }
}

$ProjectPath = Resolve-ProjectPath -ExplicitProjectPath $ProjectPath
if (-not $ProjectPath) {
    Write-Host "Could not resolve project directory containing docker-compose.yml." -ForegroundColor Red
    exit 1
}

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

$containerRuntime = Resolve-ContainerRuntime
if (-not $containerRuntime) {
    Write-Host "No supported container runtime found (Docker or Podman)." -ForegroundColor Red
    exit 1
}

Write-Host "Selected container runtime: $($containerRuntime.Name) ($($containerRuntime.Executable))" -ForegroundColor Cyan

$composeRunner = Resolve-ComposeRunner -Runtime $containerRuntime -ProjectRoot $ProjectPath
if (-not $composeRunner) {
    Write-Host "Compose provider is missing for '$($containerRuntime.Name)'." -ForegroundColor Red
    exit 1
}

Remove-ExistingTradeWijsContainer -Runtime $containerRuntime

Write-Host "Starting containers with $($composeRunner.Name)..." -ForegroundColor Cyan
$composeResult = Invoke-ComposeUp -ComposeRunner $composeRunner -WithBuild
if ($composeResult.ExitCode -ne 0) {
    $composeOutputText = ($composeResult.Output | ForEach-Object { $_.ToString() }) -join "`n"
    $isKnownPodmanComposeCleanupError = $composeRunner.Name -like "podman-compose*" -and ($composeOutputText -match "error deleting build container|identifier is not a container")

    if ($isKnownPodmanComposeCleanupError) {
        Write-Host "Detected Podman cleanup build error; retrying without --build..." -ForegroundColor Yellow
        $composeResult = Invoke-ComposeUp -ComposeRunner $composeRunner
    }
}

exit $composeResult.ExitCode
