param(
    [string]$BaseUrl = "http://127.0.0.1:3175",
    [string]$Feature = "tests/gherkin/features/timeframe-buttons.feature",
    [Alias("Spec")]
    [string]$LegacySpec,
    [Alias("SkipPlaywright")]
    [switch]$SkipGherkin
)

$ErrorActionPreference = "Stop"

Write-Host "==> Starting Python import smoke test (.venv)"
$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    throw ".venv Python not found at: $venvPython"
}

& $venvPython -c "import flask, ccxt; print('OK: flask + ccxt imports')"
if ($LASTEXITCODE -ne 0) {
    throw "Python import smoke test failed."
}

if ($SkipGherkin) {
    Write-Host "Gherkin tests skipped (-SkipGherkin)."
    exit 0
}

if ($LegacySpec) {
    $Feature = $LegacySpec
}

Write-Host "==> Starting Gherkin tests"
Write-Host "BASE_URL=$BaseUrl"
$env:BASE_URL = $BaseUrl

$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    throw "npm not found. Install Node.js (with npm) to run Gherkin tests."
}

$packageJsonPath = Join-Path $PSScriptRoot "package.json"
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "package.json not found, initializing npm project..."
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
    $cucumberPackagePath = Join-Path $PSScriptRoot "node_modules\@cucumber\cucumber\package.json"
    if (-not (Test-Path $playwrightPackagePath) -or -not (Test-Path $cucumberPackagePath)) {
        Write-Host "Required test packages not found, installing..."
        npm install -D @playwright/test @cucumber/cucumber | Out-Host
    }

    $featurePath = if ([System.IO.Path]::IsPathRooted($Feature)) { $Feature } else { Join-Path $PSScriptRoot $Feature }
    $gherkinFeatureRoot = Join-Path $PSScriptRoot "tests/gherkin/features"
    $stepDefinitionsGlob = "tests/gherkin/steps/**/*.js"

    if (Test-Path $featurePath) {
        & npx cucumber-js $Feature --require $stepDefinitionsGlob
    }
    else {
        Write-Warning "Feature not found at '$featurePath'. Running all Gherkin features."
        & npx cucumber-js $gherkinFeatureRoot --require $stepDefinitionsGlob
    }
}
finally {
    Pop-Location
}