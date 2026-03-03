param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"

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

if (-not (Test-ComposeAvailable -Runtime $containerRuntime)) {
    Write-Host "Compose provider is missing for '$($containerRuntime.Name)'." -ForegroundColor Red
    exit 1
}

Write-Host "Starting containers with $($containerRuntime.Name)..." -ForegroundColor Cyan
& $containerRuntime.Executable compose up -d --build
exit $LASTEXITCODE
