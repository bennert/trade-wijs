param(
    [string]$ProjectPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$TaskName = "TradeWijsContainerStartup"
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
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

function Test-ComposeAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Runtime
    )

    try {
        & $Runtime.Executable compose version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

if (-not (Test-IsAdministrator)) {
    Write-Host "Run this script as Administrator (required for startup task on system boot)." -ForegroundColor Red
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

if (-not (Test-ComposeAvailable -Runtime $containerRuntime)) {
    Write-Host "Compose provider is missing for '$($containerRuntime.Name)'." -ForegroundColor Red
    if ($containerRuntime.Name -eq "docker") {
        Write-Host "Install Docker Desktop or the docker compose plugin." -ForegroundColor Yellow
    }
    else {
        Write-Host "Install podman-compose or use a Podman version with compose support." -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "Building and starting containers with $($containerRuntime.Name)..." -ForegroundColor Cyan
& $containerRuntime.Executable compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build/start containers." -ForegroundColor Red
    exit $LASTEXITCODE
}

$startupScriptPath = Join-Path $ProjectPath "installers\windows\startup-trade-wijs.ps1"
if (-not (Test-Path $startupScriptPath)) {
    Write-Host "Missing startup script: $startupScriptPath" -ForegroundColor Red
    exit 1
}

$taskCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}" -ProjectPath "{1}"' -f $startupScriptPath, $ProjectPath

schtasks /Create /TN $TaskName /SC ONSTART /RU SYSTEM /RL HIGHEST /TR $taskCommand /F | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to register startup task '$TaskName'." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Installer completed." -ForegroundColor Green
Write-Host "Containers are running and will auto-start after reboot." -ForegroundColor Green
Write-Host "Open: http://localhost:3175" -ForegroundColor Green
