param(
    [string]$BaseUrl = "http://127.0.0.1:3175",
    [string]$Spec = "tests/timeframe-buttons.spec.ts",
    [switch]$SkipPlaywright
)

$ErrorActionPreference = "Stop"

Write-Host "==> Python import smoke test starten (.venv)"
$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    throw ".venv python niet gevonden op: $venvPython"
}

& $venvPython -c "import flask, ccxt; print('OK: flask + ccxt imports')"
if ($LASTEXITCODE -ne 0) {
    throw "Python import smoke test gefaald."
}

if ($SkipPlaywright) {
    Write-Host "Playwright tests overgeslagen (-SkipPlaywright)."
    exit 0
}

Write-Host "==> Playwright tests starten"
Write-Host "BASE_URL=$BaseUrl"
$env:BASE_URL = $BaseUrl

if (-not (Test-Path "package.json")) {
    throw "package.json niet gevonden. Run dit script vanuit de project root."
}

npx playwright test $Spec