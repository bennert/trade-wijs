param(
    [switch]$Detach
)

$helpersPath = Join-Path $PSScriptRoot "ps-helpers.ps1"
if (-not (Test-Path $helpersPath)) {
    Write-Host "Missing helper script: $helpersPath" -ForegroundColor Red
    exit 1
}

. $helpersPath

Add-UserPythonPath
Write-Host "Selected container runtime: podman" -ForegroundColor Cyan

if (-not (Ensure-VenvRequirements -ProjectRoot $PSScriptRoot)) {
    exit 1
}

if (-not (Test-PodmanAvailable)) {
    exit 1
}

$composeArgs = @("compose", "up", "--build")
if ($Detach) {
    $composeArgs += "-d"
}

$composeExitCode = Invoke-PodmanCommand -Arguments $composeArgs
if ($composeExitCode -ne 0) {
    exit $composeExitCode
}

if ($composeExitCode -eq 0) {
    Write-Host "App available at: http://localhost:3175" -ForegroundColor Green
    if ($Detach) {
        Write-Host "View logs: podman compose logs -f" -ForegroundColor Cyan
    }
}
