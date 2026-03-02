param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
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

docker compose up -d --build
exit $LASTEXITCODE
