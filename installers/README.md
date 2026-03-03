# Trade Wijs Installer

This folder contains installers that:

1. Build and start the containers with `docker compose up -d --build` (or `podman compose up -d --build` if Docker is unavailable)
2. Configure automatic startup after reboot
3. Ensure `.venv` exists and install/update Python packages from `requirements.txt` before startup

## Windows

Run as Administrator:

```powershell
powershell -ExecutionPolicy Bypass -File .\installers\windows\install-trade-wijs.ps1
```

Creates a Scheduled Task (`ONSTART`) to auto-start containers on system boot.
Windows installer tries Docker first and falls back to Podman automatically.
If Podman has no compose provider in PATH, installer/startup falls back to `.venv` via `python -m podman_compose`.

## Linux

```bash
chmod +x ./installers/linux/install-trade-wijs.sh
./installers/linux/install-trade-wijs.sh
```

Creates and enables a `systemd` service (`trade-wijs.service`) for startup at boot.
Installer/startup uses `installers/linux/startup-trade-wijs.sh`.

## macOS

```bash
chmod +x ./installers/macos/install-trade-wijs.sh
./installers/macos/install-trade-wijs.sh
```

Creates a LaunchAgent (`com.tradewijs.containers`) for startup after user login.
Installer/startup uses `installers/macos/startup-trade-wijs.sh`.

## Optional: custom project path

You can pass a custom project directory to Linux/macOS installers:

```bash
./installers/linux/install-trade-wijs.sh /path/to/trade-wijs
./installers/macos/install-trade-wijs.sh /path/to/trade-wijs
```

For Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\installers\windows\install-trade-wijs.ps1 -ProjectPath "C:\path\to\trade-wijs"
```
