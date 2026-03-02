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

if (-not (Test-IsAdministrator)) {
    Write-Host "Run this script as Administrator (required for startup task on system boot)." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

Set-Location -LiteralPath $ProjectPath

try {
    docker compose version | Out-Null
}
catch {
    Write-Host "Docker Compose plugin is missing. Install Docker Desktop or docker compose plugin first." -ForegroundColor Red
    exit 1
}

Write-Host "Building and starting containers..." -ForegroundColor Cyan
docker compose up -d --build
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
