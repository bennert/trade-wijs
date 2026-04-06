$helpersPath = Join-Path $PSScriptRoot "ps-helpers.ps1"
if (-not (Test-Path $helpersPath)) {
    Write-Host "Missing helper script: $helpersPath" -ForegroundColor Red
    exit 1
}

. $helpersPath

Add-UserPythonPath
$env:PODMAN_COMPOSE_WARNING_LOGS = "false"

$composeRunner = @(Resolve-ComposeRunner -ProjectRoot $PSScriptRoot | Where-Object { $_ }) | Select-Object -First 1
if (-not $composeRunner) {
    exit 1
}

Write-Host "Selected container runtime: $($composeRunner.Runtime.Name)" -ForegroundColor Cyan
Write-Host "Selected compose runner: $($composeRunner.Name)" -ForegroundColor DarkGray

$composeExitCode = Invoke-ComposeCommand -ComposeRunner $composeRunner -Arguments @("down", "--remove-orphans")
if ($composeExitCode -ne 0) {
    exit $composeExitCode
}

if ($composeExitCode -eq 0) {
    Write-Host "Trade Wijs has been stopped." -ForegroundColor Green
}
