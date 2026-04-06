function Test-IsWindows {
    if (Get-Variable -Name IsWindows -ErrorAction SilentlyContinue) {
        return [bool]$IsWindows
    }

    return $env:OS -eq "Windows_NT"
}

function Add-UserPythonPath {
    $separator = [System.IO.Path]::PathSeparator
    $pathEntries = $env:PATH -split [regex]::Escape($separator)
    $candidatePaths = @()

    if (Test-IsWindows) {
        if ($env:APPDATA) {
            $candidatePaths += (Join-Path $env:APPDATA "Python\Python311\Scripts")
            $candidatePaths += (Join-Path $env:APPDATA "Python\Scripts")
        }
    }
    elseif ($env:HOME) {
        $candidatePaths += (Join-Path $env:HOME ".local/bin")
    }

    foreach ($candidatePath in ($candidatePaths | Select-Object -Unique)) {
        if ((Test-Path $candidatePath) -and -not ($pathEntries -contains $candidatePath)) {
            $env:PATH = "$candidatePath$separator$env:PATH"
            $pathEntries = $env:PATH -split [regex]::Escape($separator)
        }
    }
}

function Get-PythonLauncher {
    if (Test-IsWindows) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            return @{
                Executable = "py"
                PrefixArgs = @("-3")
            }
        }

        if (Get-Command python -ErrorAction SilentlyContinue) {
            return @{
                Executable = "python"
                PrefixArgs = @()
            }
        }
    }
    else {
        if (Get-Command python3 -ErrorAction SilentlyContinue) {
            return @{
                Executable = "python3"
                PrefixArgs = @()
            }
        }

        if (Get-Command python -ErrorAction SilentlyContinue) {
            return @{
                Executable = "python"
                PrefixArgs = @()
            }
        }
    }

    return $null
}

function Ensure-VenvRequirements {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $requirementsPath = Join-Path $ProjectRoot "requirements.txt"
    if (-not (Test-Path $requirementsPath)) {
        Write-Host "No requirements.txt found at $requirementsPath, skipping venv package sync." -ForegroundColor Yellow
        return $true
    }

    $venvPath = Join-Path $ProjectRoot ".venv"

    if (-not (Test-Path $venvPath)) {
        $pythonLauncher = Get-PythonLauncher
        if (-not $pythonLauncher) {
            Write-Host "Python launcher not found (py/python/python3)." -ForegroundColor Red
            return $false
        }

        Write-Host "Creating virtual environment at $venvPath" -ForegroundColor Cyan
        & $pythonLauncher.Executable @($pythonLauncher.PrefixArgs) -m venv $venvPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to create virtual environment." -ForegroundColor Red
            return $false
        }
    }

    $venvPython = if (Test-IsWindows) {
        Join-Path $venvPath "Scripts\python.exe"
    }
    else {
        Join-Path $venvPath "bin/python"
    }

    if (-not (Test-Path $venvPython)) {
        Write-Host "Venv Python executable not found: $venvPython" -ForegroundColor Red
        return $false
    }

    $requirementsHash = (Get-FileHash -Path $requirementsPath -Algorithm SHA256).Hash
    $hashFile = Join-Path $venvPath ".requirements.sha256"
    $needsInstall = $true

    if (Test-Path $hashFile) {
        $storedHash = (Get-Content $hashFile -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($storedHash -eq $requirementsHash) {
            $needsInstall = $false
        }
    }

    if (-not $needsInstall) {
        Write-Host "requirements.txt unchanged; skipping package installation." -ForegroundColor DarkGray
        return $true
    }

    Write-Host "Installing packages from requirements.txt into .venv" -ForegroundColor Cyan
    & $venvPython -m pip install -r $requirementsPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install packages from requirements.txt." -ForegroundColor Red
        return $false
    }

    Set-Content -Path $hashFile -Value $requirementsHash -Encoding UTF8
    return $true
}

function Show-ComposeProviderInstallHint {
    Write-Host "Podman compose provider was not found." -ForegroundColor Red
    if (Test-IsWindows) {
        Write-Host "Install it with: py -m pip install --user podman-compose" -ForegroundColor Yellow
    }
    else {
        Write-Host "Install it with: python3 -m pip install --user podman-compose" -ForegroundColor Yellow
    }
}

function Invoke-NativeCommandCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue)
    if ($hasNativePref) {
        $previousNativePref = $Global:PSNativeCommandUseErrorActionPreference
        $Global:PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        $commandOutput = & $Executable @Arguments 2>&1
        $commandExitCode = $LASTEXITCODE

        return @{
            ExitCode = $commandExitCode
            Output = @($commandOutput | ForEach-Object { $_.ToString() })
        }
    }
    finally {
        if ($hasNativePref) {
            $Global:PSNativeCommandUseErrorActionPreference = $previousNativePref
        }
    }
}

function Resolve-DockerExecutable {
    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCommand) {
        return $dockerCommand.Source
    }

    if (Test-IsWindows) {
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
            if ($candidate -and (Test-Path $candidate)) {
                return $candidate
            }
        }
    }

    return $null
}

function Test-PodmanAvailable {
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) {
        Write-Host "Podman was not found in PATH." -ForegroundColor Red
        Write-Host "Install Podman first: https://podman.io/docs/installation" -ForegroundColor Yellow
        return $false
    }

    return $true
}

function Resolve-PodmanExecutable {
    $podmanCommand = Get-Command podman -ErrorAction SilentlyContinue
    if ($podmanCommand) {
        return $podmanCommand.Source
    }

    return $null
}

function Test-ContainerRuntimeHealthy {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Runtime
    )

    $arguments = if ($Runtime.Name -eq "docker") {
        @("info", "--format", "{{.ServerVersion}}")
    }
    else {
        @("info", "--format", "json")
    }

    $result = Invoke-NativeCommandCapture -Executable $Runtime.Executable -Arguments $arguments
    return @{
        IsHealthy = ($result.ExitCode -eq 0)
        OutputText = ($result.Output -join "`n")
    }
}

function Repair-PodmanRuntime {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Runtime
    )

    Write-Host "Podman is installed but not currently reachable. Attempting 'podman machine start'..." -ForegroundColor Yellow
    $startResult = Invoke-NativeCommandCapture -Executable $Runtime.Executable -Arguments @("machine", "start")
    if ($startResult.Output) {
        $startResult.Output | ForEach-Object { Write-Host $_ }
    }

    if ($startResult.ExitCode -ne 0) {
        return $false
    }

    $health = Test-ContainerRuntimeHealthy -Runtime $Runtime
    return $health.IsHealthy
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

    $venvPython = if (Test-IsWindows) {
        Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    }
    else {
        Join-Path $ProjectRoot ".venv/bin/python"
    }

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
    }

    if (-not $isPodmanComposeAvailable) {
        return $null
    }

    return @{
        Runtime = @{
            Name = "podman"
            Executable = (Resolve-PodmanExecutable)
        }
        Name = "podman-compose (.venv)"
        Executable = $venvPython
        PrefixArgs = @("-m", "podman_compose")
    }
}

function Resolve-ComposeRunner {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,
        [switch]$InstallPodmanComposeIfMissing
    )

    $candidateRuntimes = @()
    $dockerExecutable = Resolve-DockerExecutable
    if ($dockerExecutable) {
        $candidateRuntimes += @{
            Name = "docker"
            Executable = $dockerExecutable
        }
    }

    $podmanExecutable = Resolve-PodmanExecutable
    if ($podmanExecutable) {
        $candidateRuntimes += @{
            Name = "podman"
            Executable = $podmanExecutable
        }
    }

    foreach ($runtime in $candidateRuntimes) {
        $health = Test-ContainerRuntimeHealthy -Runtime $runtime
        if (-not $health.IsHealthy -and $runtime.Name -eq "podman") {
            $repaired = Repair-PodmanRuntime -Runtime $runtime
            if ($repaired) {
                $health = @{
                    IsHealthy = $true
                    OutputText = ""
                }
            }
        }

        if (-not $health.IsHealthy) {
            if ($runtime.Name -eq "podman") {
                Write-Host "Skipping Podman because the engine is not reachable." -ForegroundColor Yellow
                if ($health.OutputText) {
                    Write-Host $health.OutputText -ForegroundColor DarkGray
                }
            }
            continue
        }

        if ($runtime.Name -eq "podman") {
            $venvRunner = Get-PodmanComposeVenvRunner -ProjectRoot $ProjectRoot -InstallIfMissing:$InstallPodmanComposeIfMissing
            if ($venvRunner) {
                return $venvRunner
            }
        }

        $composeVersion = Invoke-NativeCommandCapture -Executable $runtime.Executable -Arguments @("compose", "version")
        if ($composeVersion.ExitCode -eq 0) {
            return @{
                Runtime = $runtime
                Name = "$($runtime.Name) compose"
                Executable = $runtime.Executable
                PrefixArgs = @("compose")
            }
        }

        if ($runtime.Name -eq "podman") {
            $venvRunner = Get-PodmanComposeVenvRunner -ProjectRoot $ProjectRoot -InstallIfMissing:$InstallPodmanComposeIfMissing
            if ($venvRunner) {
                return $venvRunner
            }
        }
    }

    Write-Host "No healthy container runtime with compose support was found." -ForegroundColor Red
    if ($podmanExecutable) {
        Write-Host "If you want to use Podman, verify the machine is available with 'podman machine init' and 'podman machine start'." -ForegroundColor Yellow
    }
    if ($dockerExecutable) {
        Write-Host "If you want to use Docker, ensure Docker Desktop is running." -ForegroundColor Yellow
    }
    return $null
}

function Invoke-ComposeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$ComposeRunner,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $outputLines = New-Object System.Collections.Generic.List[string]

    $commandArguments = @($ComposeRunner.PrefixArgs + $Arguments)

    & $ComposeRunner.Executable @commandArguments 2>&1 | ForEach-Object {
        $line = $_.ToString()
        $outputLines.Add($line) | Out-Null
        Write-Host $line
    }

    $commandExitCode = $LASTEXITCODE

    if ($commandExitCode -ne 0) {
        $combinedOutput = $outputLines -join "`n"
        if ($combinedOutput -match "podman-compose|compose provider|compose was not found|unknown command.+compose") {
            Show-ComposeProviderInstallHint
        }
        else {
            Write-Host "$($ComposeRunner.Name) command failed. See error output above." -ForegroundColor Red
        }
    }

    return $commandExitCode
}

function Invoke-PodmanCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $podmanExecutable = Resolve-PodmanExecutable
    if (-not $podmanExecutable) {
        Write-Host "Podman was not found in PATH." -ForegroundColor Red
        return 1
    }

    return Invoke-ComposeCommand -ComposeRunner @{
        Runtime = @{
            Name = "podman"
            Executable = $podmanExecutable
        }
        Name = "podman"
        Executable = $podmanExecutable
        PrefixArgs = @()
    } -Arguments $Arguments
}
