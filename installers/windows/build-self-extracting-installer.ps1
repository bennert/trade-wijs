param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$DistPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path "dist"),
    [string]$OutputDirectory = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string]$ZipName = "trade-wijs-installer-windows.zip",
    [string]$ExeName = "trade-wijs-installer-windows.exe",
    [string]$ArchiveName = "trade-wijs-installer-windows.7z"
)

$ErrorActionPreference = "Stop"

function Copy-ToDist {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath,
        [switch]$Recurse
    )

    if (-not (Test-Path $SourcePath)) {
        throw "Required source path not found: $SourcePath"
    }

    $destinationParent = Split-Path -Parent $DestinationPath
    if ($destinationParent -and -not (Test-Path $destinationParent)) {
        New-Item -Path $destinationParent -ItemType Directory -Force | Out-Null
    }

    if ($Recurse) {
        Copy-Item -Path $SourcePath -Destination $DestinationPath -Recurse -Force
        return
    }

    Copy-Item -Path $SourcePath -Destination $DestinationPath -Force
}

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path

if (-not (Test-Path $OutputDirectory)) {
    New-Item -Path $OutputDirectory -ItemType Directory -Force | Out-Null
}

if (Test-Path $DistPath) {
    Remove-Item -Path $DistPath -Recurse -Force
}

New-Item -Path $DistPath -ItemType Directory -Force | Out-Null
New-Item -Path (Join-Path $DistPath "installers\windows") -ItemType Directory -Force | Out-Null

Copy-ToDist -SourcePath (Join-Path $ProjectRoot "docker-compose.yml") -DestinationPath (Join-Path $DistPath "docker-compose.yml")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "Dockerfile") -DestinationPath (Join-Path $DistPath "Dockerfile")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "requirements.txt") -DestinationPath (Join-Path $DistPath "requirements.txt")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "app.py") -DestinationPath (Join-Path $DistPath "app.py")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "ps-helpers.ps1") -DestinationPath (Join-Path $DistPath "ps-helpers.ps1")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "installers\README.md") -DestinationPath (Join-Path $DistPath "installers\README.md")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "static") -DestinationPath (Join-Path $DistPath "static") -Recurse
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "templates") -DestinationPath (Join-Path $DistPath "templates") -Recurse
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "installers\windows\install-trade-wijs.ps1") -DestinationPath (Join-Path $DistPath "installers\windows\install-trade-wijs.ps1")
Copy-ToDist -SourcePath (Join-Path $ProjectRoot "installers\windows\startup-trade-wijs.ps1") -DestinationPath (Join-Path $DistPath "installers\windows\startup-trade-wijs.ps1")

Compress-Archive -Path (Join-Path $DistPath "*") -DestinationPath (Join-Path $OutputDirectory $ZipName) -Force

$sevenZip = Get-Command 7z.exe -ErrorAction SilentlyContinue
if (-not $sevenZip) {
    if (Get-Command choco.exe -ErrorAction SilentlyContinue) {
        choco install 7zip -y
        $sevenZip = Get-Command 7z.exe -ErrorAction SilentlyContinue
    }
}

if (-not $sevenZip) {
    throw "7z.exe not found after installation attempt."
}

$sevenZipDir = Split-Path -Parent $sevenZip.Source
$sfxModuleCandidates = @(
    (Join-Path $sevenZipDir "7z.sfx"),
    (Join-Path ${env:ProgramFiles} "7-Zip\7z.sfx"),
    (Join-Path ${env:ProgramFiles(x86)} "7-Zip\7z.sfx"),
    "C:\ProgramData\chocolatey\lib\7zip\tools\7z.sfx",
    "C:\ProgramData\chocolatey\lib\7zip.commandline\tools\7z.sfx"
)

$sfxModulePath = $sfxModuleCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $sfxModulePath) {
    $searchRoots = @(
        (Join-Path ${env:ProgramFiles} "7-Zip"),
        (Join-Path ${env:ProgramFiles(x86)} "7-Zip"),
        "C:\ProgramData\chocolatey\lib"
    )

    foreach ($searchRoot in $searchRoots) {
        if (-not $searchRoot -or -not (Test-Path $searchRoot)) {
            continue
        }

        $foundSfx = Get-ChildItem -Path $searchRoot -Filter "7z.sfx" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundSfx) {
            $sfxModulePath = $foundSfx.FullName
            break
        }
    }
}

if (-not (Test-Path $sfxModulePath)) {
    throw "7z.sfx not found at $sfxModulePath"
}

$archivePath = Join-Path $OutputDirectory $ArchiveName
$exePath = Join-Path $OutputDirectory $ExeName
$sfxConfigPath = Join-Path $OutputDirectory "sfx-config.txt"

& $sevenZip.Source a -t7z $archivePath (Join-Path $DistPath "*")

$sfxConfigLines = @(
    ';!@Install@!UTF-8!'
    'Title="Trade Wijs Installer"'
    'RunProgram="powershell.exe -NoProfile -ExecutionPolicy Bypass -File installers\\windows\\install-trade-wijs.ps1"'
    'GUIMode="2"'
    ';!@InstallEnd@!'
)
$sfxConfigLines | Set-Content -Path $sfxConfigPath -Encoding UTF8

$sfxBytes = [System.IO.File]::ReadAllBytes($sfxModulePath)
$configBytes = [System.IO.File]::ReadAllBytes($sfxConfigPath)
$archiveBytes = [System.IO.File]::ReadAllBytes($archivePath)

$outputBytes = New-Object byte[] ($sfxBytes.Length + $configBytes.Length + $archiveBytes.Length)
[System.Buffer]::BlockCopy($sfxBytes, 0, $outputBytes, 0, $sfxBytes.Length)
[System.Buffer]::BlockCopy($configBytes, 0, $outputBytes, $sfxBytes.Length, $configBytes.Length)
[System.Buffer]::BlockCopy($archiveBytes, 0, $outputBytes, $sfxBytes.Length + $configBytes.Length, $archiveBytes.Length)
[System.IO.File]::WriteAllBytes($exePath, $outputBytes)

Remove-Item $archivePath -ErrorAction SilentlyContinue
Remove-Item $sfxConfigPath -ErrorAction SilentlyContinue

if (-not (Test-Path $exePath)) {
    throw "Failed to create self-extracting installer: $exePath"
}

Write-Host "Created ZIP: $(Join-Path $OutputDirectory $ZipName)" -ForegroundColor Green
Write-Host "Created EXE: $exePath" -ForegroundColor Green
