# Trade Wijs (v1)

First version of a Python web app with only a TradingView-like screen layout.

## Start with Docker

```bash
docker compose up --build
```

Then open:

- http://localhost:3175

## Start with Podman (Windows, Linux, macOS)

If `docker` is not available, use Podman:

```powershell
podman compose up --build
```

Then open:

- http://localhost:3175

If you get an error that the compose provider is missing:

```powershell
python3 -m pip install --user podman-compose
podman compose up --build
```

On Windows you can also use:

```powershell
py -m pip install --user podman-compose
```

Or use the included PowerShell scripts (they apply PATH fixes automatically):

- On Windows installer/startup scripts, Podman compose automatically falls back to `.venv` (`python -m podman_compose`) when no compose provider is found in PATH.

- Ensure `.venv` exists and install/update packages from `requirements.txt` when it changes

- `start.ps1`, `stop.ps1`, and `logs.ps1` suppress the external compose provider banner by setting `PODMAN_COMPOSE_WARNING_LOGS=false` for the script process.

Windows:
```powershell
.\start.ps1
```

Linux/macOS (PowerShell 7+):

```bash
pwsh ./start.ps1
```

`start.ps1` always runs in detached mode, streams startup logs while waiting, and reports whether the app is reachable at `http://localhost:3175`.

Stop:

Windows:
```powershell
.\stop.ps1
```

Linux/macOS:

```bash
pwsh ./stop.ps1
```

Follow logs:

Windows:
```powershell
.\logs.ps1
```

Linux/macOS:

```bash
pwsh ./logs.ps1
```

## Tests

Run all checks:

```powershell
.\test.ps1
```

Only run the Python import smoke test:

```powershell
.\test.ps1 -SkipGherkin
```

Run a specific Gherkin feature:

```powershell
.\test.ps1 -Feature tests/gherkin/features/timeframe-buttons.feature
```

`test.ps1` now bootstraps Cucumber automatically when needed:

- Creates `package.json` with `npm init -y` if missing
- Installs `@cucumber/cucumber` and `@playwright/test` if not present
- Runs `npx cucumber-js` with the configured feature path
- Falls back to all Gherkin features if the requested feature path does not exist

CI note:

- Runner needs Node.js + npm for Cucumber/Playwright bootstrap
- Keep Python `.venv` available because the script always runs the Python import smoke test first

## What's included in v1?

- Topbar
- Left watchlist
- Middle chart area with interactive chart
- Horizontal Line drawing tool (single click on chart)
- Undo for drawn horizontal lines
- Maximum of 20 horizontal lines (oldest line is removed first)
- Right order/position panels (placeholders)
- Bottom tab bar

There is no trading functionality in this version yet.

### Gebruik: Horizontal Line

- Klik op `Horizontal Line` in de chart toolbar
- Klik in de chart om een horizontale lijn te plaatsen
- Klik op `Undo` (of gebruik `Backspace`/`Delete`) om de laatste lijn te verwijderen

## Installer + auto-start (Windows, Linux, macOS)

Installers are available in [installers/README.md](installers/README.md).

They do two things:

- Build and start containers (`docker compose up -d --build`)
- Configure startup after reboot (Windows Task Scheduler, Linux systemd, macOS LaunchAgent)

GitHub Actions workflow [.github/workflows/build-installers.yml](.github/workflows/build-installers.yml) packages installer artifacts for:

- Windows (`.zip`)
- Linux (`.tar.gz`)
- macOS (`.tar.gz`)
