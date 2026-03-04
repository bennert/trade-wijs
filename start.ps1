function Test-TcpPortOpen {
    param(
        [Parameter(Mandatory = $true)]
        [string]$HostName,
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [int]$ConnectTimeoutMs = 1500
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connectTask = $client.ConnectAsync($HostName, $Port)
        if (-not $connectTask.Wait($ConnectTimeoutMs)) {
            return $false
        }

        return $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

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

$composeArgs = @("compose", "up", "--build", "-d")

$appHost = "localhost"
$appPort = 3175
$appUrl = "http://${appHost}:$appPort"

Write-Host "Starting containers in detached mode..." -ForegroundColor Cyan

$composeExitCode = Invoke-PodmanCommand -Arguments $composeArgs
if ($composeExitCode -ne 0) {
    exit $composeExitCode
}

Write-Host "Streaming startup logs while waiting for readiness..." -ForegroundColor Cyan
$logJob = Start-Job -ScriptBlock {
    param($projectRoot)
    Set-Location $projectRoot
    & podman compose logs -f 2>&1
} -ArgumentList $PSScriptRoot

Write-Host "Waiting for app readiness on $appUrl ..." -ForegroundColor Yellow
$timeoutSeconds = 90
$pollIntervalMs = 1500
$deadline = (Get-Date).AddSeconds($timeoutSeconds)
$isReady = $false

while ((Get-Date) -lt $deadline) {
    Receive-Job -Job $logJob -Keep -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host $_
    }

    if (Test-TcpPortOpen -HostName $appHost -Port $appPort) {
        $isReady = $true
        break
    }

    Start-Sleep -Milliseconds $pollIntervalMs
}

Receive-Job -Job $logJob -Keep -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host $_
}

if ($logJob.State -eq "Running") {
    Stop-Job -Job $logJob -ErrorAction SilentlyContinue
}
Remove-Job -Job $logJob -Force -ErrorAction SilentlyContinue

if ($isReady) {
    Write-Host "Container started and app is reachable at: $appUrl" -ForegroundColor Green
}
else {
    Write-Host "Containers started, but app is not reachable yet at: $appUrl" -ForegroundColor Yellow
}

Write-Host "View logs: podman compose logs -f" -ForegroundColor Cyan
