function Test-IsWindows {
    if (Get-Variable -Name IsWindows -ErrorAction SilentlyContinue) {
        return [bool]$IsWindows
    }

    return $env:OS -eq "Windows_NT"
}

function Add-UserPythonPath {
    $separator = [System.IO.Path]::PathSeparator
    $pathEntries = $env:PATH -split [regex]::Escape($separator)
    $candidatePaths = @()

    if (Test-IsWindows) {
        if ($env:APPDATA) {
            $candidatePaths += (Join-Path $env:APPDATA "Python\Python311\Scripts")
            $candidatePaths += (Join-Path $env:APPDATA "Python\Scripts")
        }
    }
    elseif ($env:HOME) {
        $candidatePaths += (Join-Path $env:HOME ".local/bin")
    }

    foreach ($candidatePath in ($candidatePaths | Select-Object -Unique)) {
        if ((Test-Path $candidatePath) -and -not ($pathEntries -contains $candidatePath)) {
            $env:PATH = "$candidatePath$separator$env:PATH"
            $pathEntries = $env:PATH -split [regex]::Escape($separator)
        }
    }
}

function Get-PythonLauncher {
    if (Test-IsWindows) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            return @{
                Executable = "py"
                PrefixArgs = @("-3")
            }
        }

        if (Get-Command python -ErrorAction SilentlyContinue) {
            return @{
                Executable = "python"
                PrefixArgs = @()
            }
        }
    }
    else {
        if (Get-Command python3 -ErrorAction SilentlyContinue) {
            return @{
                Executable = "python3"
                PrefixArgs = @()
            }
        }

        if (Get-Command python -ErrorAction SilentlyContinue) {
            return @{
                Executable = "python"
                PrefixArgs = @()
            }
        }
    }

    return $null
}

function Ensure-VenvRequirements {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $requirementsPath = Join-Path $ProjectRoot "requirements.txt"
    if (-not (Test-Path $requirementsPath)) {
        Write-Host "No requirements.txt found at $requirementsPath, skipping venv package sync." -ForegroundColor Yellow
        return $true
    }

    $venvPath = Join-Path $ProjectRoot ".venv"

    if (-not (Test-Path $venvPath)) {
        $pythonLauncher = Get-PythonLauncher
        if (-not $pythonLauncher) {
            Write-Host "Python launcher not found (py/python/python3)." -ForegroundColor Red
            return $false
        }

        Write-Host "Creating virtual environment at $venvPath" -ForegroundColor Cyan
        & $pythonLauncher.Executable @($pythonLauncher.PrefixArgs) -m venv $venvPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to create virtual environment." -ForegroundColor Red
            return $false
        }
    }

    $venvPython = if (Test-IsWindows) {
        Join-Path $venvPath "Scripts\python.exe"
    }
    else {
        Join-Path $venvPath "bin/python"
    }

    if (-not (Test-Path $venvPython)) {
        Write-Host "Venv Python executable not found: $venvPython" -ForegroundColor Red
        return $false
    }

    $requirementsHash = (Get-FileHash -Path $requirementsPath -Algorithm SHA256).Hash
    $hashFile = Join-Path $venvPath ".requirements.sha256"
    $needsInstall = $true

    if (Test-Path $hashFile) {
        $storedHash = (Get-Content $hashFile -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($storedHash -eq $requirementsHash) {
            $needsInstall = $false
        }
    }

    if (-not $needsInstall) {
        Write-Host "requirements.txt unchanged; skipping package installation." -ForegroundColor DarkGray
        return $true
    }

    Write-Host "Installing packages from requirements.txt into .venv" -ForegroundColor Cyan
    & $venvPython -m pip install -r $requirementsPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install packages from requirements.txt." -ForegroundColor Red
        return $false
    }

    Set-Content -Path $hashFile -Value $requirementsHash -Encoding UTF8
    return $true
}

function Show-ComposeProviderInstallHint {
    Write-Host "Podman compose provider was not found." -ForegroundColor Red
    if (Test-IsWindows) {
        Write-Host "Install it with: py -m pip install --user podman-compose" -ForegroundColor Yellow
    }
    else {
        Write-Host "Install it with: python3 -m pip install --user podman-compose" -ForegroundColor Yellow
    }
}

function Test-PodmanAvailable {
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) {
        Write-Host "Podman was not found in PATH." -ForegroundColor Red
        Write-Host "Install Podman first: https://podman.io/docs/installation" -ForegroundColor Yellow
        return $false
    }

    return $true
}

function Invoke-PodmanCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $commandOutput = & podman @Arguments 2>&1
    $commandExitCode = $LASTEXITCODE

    if ($commandOutput) {
        $commandOutput | ForEach-Object { Write-Host $_ }
    }

    if ($commandExitCode -ne 0) {
        $combinedOutput = ($commandOutput | ForEach-Object { $_.ToString() }) -join "`n"
        if ($combinedOutput -match "podman-compose|compose provider|compose was not found|unknown command.+compose") {
            Show-ComposeProviderInstallHint
        }
        else {
            Write-Host "Podman compose command failed. See error output above." -ForegroundColor Red
        }
    }

    return $commandExitCode
}
