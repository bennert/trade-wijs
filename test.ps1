param(
    [string]$BaseUrl = "http://127.0.0.1:3175",
    [string]$Spec = "tests/timeframe-buttons.spec.ts",
    [string]$PlaywrightReporter = "list",
    [string]$PlaywrightJunitOutputFile,
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

$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    throw "npm niet gevonden. Installeer Node.js (met npm) om Playwright tests te draaien."
}

$packageJsonPath = Join-Path $PSScriptRoot "package.json"
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "package.json niet gevonden, npm project initialiseren..."
    Push-Location $PSScriptRoot
    try {
        npm init -y | Out-Host
    }
    finally {
        Pop-Location
    }
}

Push-Location $PSScriptRoot
try {
    $playwrightPackagePath = Join-Path $PSScriptRoot "node_modules\@playwright\test\package.json"
    if (-not (Test-Path $playwrightPackagePath)) {
        Write-Host "@playwright/test niet gevonden, installeren..."
        npm install -D @playwright/test | Out-Host
    }

    Write-Host "Playwright browsers installeren/controleren..."
    npx playwright install | Out-Host

    $playwrightArgs = @("playwright", "test")
    if ($PlaywrightReporter) {
        $playwrightArgs += @("--reporter", $PlaywrightReporter)
    }

    if ($PlaywrightJunitOutputFile) {
        $resolvedJunitOutputFile = if ([System.IO.Path]::IsPathRooted($PlaywrightJunitOutputFile)) {
            $PlaywrightJunitOutputFile
        }
        else {
            Join-Path $PSScriptRoot $PlaywrightJunitOutputFile
        }

        $junitDirectory = Split-Path -Path $resolvedJunitOutputFile -Parent
        if ($junitDirectory) {
            New-Item -ItemType Directory -Path $junitDirectory -Force | Out-Null
        }

        $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE = $resolvedJunitOutputFile
        Write-Host "JUnit output: $resolvedJunitOutputFile"
    }

    $specPath = if ([System.IO.Path]::IsPathRooted($Spec)) { $Spec } else { Join-Path $PSScriptRoot $Spec }
    if (Test-Path $specPath) {
        $playwrightArgsWithSpec = $playwrightArgs + $Spec
        & npx @playwrightArgsWithSpec
    }
    else {
        Write-Warning "Spec niet gevonden op '$specPath'. Alle Playwright tests worden uitgevoerd."
        & npx @playwrightArgs
    }
}
finally {
    Pop-Location
}