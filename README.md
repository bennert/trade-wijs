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
.\tests.ps1
```

Only run the Python import smoke test:

```powershell
.\tests.ps1 -SkipGherkin
```

Run a specific Gherkin feature:

```powershell
.\tests.ps1 -Feature tests/gherkin/features/timeframe-buttons.feature
```

`tests.ps1` is the main test entrypoint and bootstraps Cucumber automatically when needed:

- Creates `package.json` with `npm init -y` if missing
- Installs `@cucumber/cucumber` and `@playwright/test` if not present
- Runs `npx cucumber-js` with the configured feature path
- Falls back to all Gherkin features if the requested feature path does not exist

CI note:

- Runner needs Node.js + npm for Cucumber/Playwright bootstrap
- Keep Python `.venv` available because the script always runs the Python import smoke test first

## Recent updates

- Undo history for drawing tools is now persisted in local storage and restored after a page reload.
- Target architecture and modularization roadmap are documented in [docs/modularization-plan.md](docs/modularization-plan.md).
- Worker responsibilities have been split into separate market snapshot, exchange settings, and chart warmer workers.
- **Phase 2: Thin Routes** — HTTP route handlers were slimmed down. All business logic was moved to `trade_wijs.application.use_cases` with type-safe request/response dataclasses.
- **Phase 3: Exchange & Cache Contracts** — Explicit domain models (`ChartPayload`, `MarketQuote`, `ExchangeSettings`) and repository interfaces (`CacheRepository`, `ExchangeGateway`) isolate business logic from CCXT/PostgreSQL implementation details.
- **Phase 4: Worker Health & Logging** — All three workers now have structured JSON logging, health checks, and cycle tracking for improved observability and diagnostics.
- **Phase 5: Frontend Modularization** — The large inline JavaScript in the template was moved to `static/js/index-app.js`, with runtime bootstrap data via an `application/json` script node.
- **Phase 6: Wrapper Entrypoints Removed** — Legacy root wrappers (`app.py`, `worker.py`) were removed; runtime now starts directly via package modules (`python -m trade_wijs.api.app` and `python -m trade_wijs.workers.*`).
- **Phase 7: Compatibility Layer Reduced** — Broad re-export in `app_services.py` was removed; use cases and workers now import directly from target modules (`app_services_payloads.py`, `app_services_exchange.py`, `app_services_market.py`, `app_services_config.py`).

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

## Version format

The app header shows the version as:

- `<semver>+<short-commit-id>` (for example: `1.2.3+abc1234`)

Behavior:

- Semver is resolved from the latest git tag that matches `X.Y.Z`
- Commit id is resolved from `git rev-parse --short HEAD`
- If git metadata is unavailable, the app falls back to semver only
- In Docker/Podman, you can set `APP_VERSION` to override version resolution (the bundled `start.ps1` sets this automatically)

### Usage: Horizontal Line

- Click `Horizontal Line` in the chart toolbar
- Click inside the chart to place a horizontal line
- Click `Undo` (or use `Backspace`/`Delete`) to remove the last line

## Installer + auto-start (Windows, Linux, macOS)

Installers are available in [installers/README.md](installers/README.md).

They do two things:

- Build and start containers (`docker compose up -d --build`)
- Configure startup after reboot (Windows Task Scheduler, Linux systemd, macOS LaunchAgent)

GitHub Actions workflow [.github/workflows/build-installers.yml](.github/workflows/build-installers.yml) packages installer artifacts for:

- Windows (`.zip`)
- Linux (`.tar.gz`)
- macOS (`.tar.gz`)
