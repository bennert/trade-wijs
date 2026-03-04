$helpersPath = Join-Path $PSScriptRoot "ps-helpers.ps1"
if (-not (Test-Path $helpersPath)) {
    Write-Host "Missing helper script: $helpersPath" -ForegroundColor Red
    exit 1
}

. $helpersPath

Add-UserPythonPath
$env:PODMAN_COMPOSE_WARNING_LOGS = "false"
Write-Host "Selected container runtime: podman" -ForegroundColor Cyan

if (-not (Test-PodmanAvailable)) {
    exit 1
}

$composeExitCode = Invoke-PodmanCommand -Arguments @("compose", "logs", "-f")
if ($composeExitCode -ne 0) {
    exit $composeExitCode
}
