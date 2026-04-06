# Modularization Plan

## Goal

Trade Wijs should move toward a modular architecture without immediately taking on the operational complexity of a full microservices setup. The right intermediate step is a modular monolith with clear component boundaries, after which individual parts can optionally be extracted into separate containers or services.

This plan uses the Gainium approach as a reference:

- `docker-sh` mainly acts as a composition layer
- `exchange-connector-sh` is a dedicated exchange boundary
- `websocket-connector-sh` is a dedicated streaming boundary
- `indicators` is an independent domain component

For Trade Wijs this does not mean splitting everything right away. It does mean enforcing clear responsibility boundaries first.

## Current state

The current codebase is functionally split, but not yet architecturally bounded:

- `app.py` combines Flask routes with request handling and payload assembly
- `app_services_payloads.py` mixes fetching, normalization, caching, fallback logic, and response shaping
- `worker.py` combines multiple background concerns in one process
- `app_services.py` keeps a broad compatibility layer in place
- `templates/index.html` contains a large amount of inline JavaScript and UI state

As a result, boundaries between domain logic, infrastructure, and presentation are still too porous.

## Target architecture

### 1. Internal modular monolith

Proposed target structure:

```text
trade_wijs/
  api/
    app.py
    routes/
      chart.py
      settings.py
      market.py
    presenters/
      chart_payload.py
      market_quote.py
      exchange_settings.py
  application/
    use_cases/
      get_chart.py
      get_market_quote.py
      get_exchange_settings.py
      warm_chart_cache.py
      refresh_market_snapshots.py
      refresh_exchange_settings.py
  domain/
    chart/
      models.py
      services.py
    market/
      models.py
      services.py
    exchange/
      models.py
      services.py
    indicators/
      models.py
      services.py
  adapters/
    exchange/
      ccxt_gateway.py
    cache/
      postgres_cache.py
    web/
      flask_cookies.py
    version/
      git_version.py
  workers/
    market_snapshot_worker.py
    exchange_settings_worker.py
    chart_warmer_worker.py
  frontend/
    templates/
      index.html
    static/
      css/
        style.css
      js/
        bootstrap.js
        api-client.js
        chart/
          chart-engine.js
          pane-layout.js
          indicators.js
        settings/
          settings-store.js
          exchange-settings.js
        market/
          selectors.js
          tabs.js
        tools/
          horizontal-line.js
          trend-line.js
  shared/
    config.py
    types.py
```

### 2. Responsibilities per layer

`api`

- receives HTTP requests
- validates input
- calls use cases
- translates results into HTML or JSON

`application`

- orchestrates use cases
- owns workflow logic
- has no Flask details and no ccxt details

`domain`

- contains business rules
- contains models and decision logic
- has no database, HTTP, or container runtime knowledge

`adapters`

- contains infrastructure implementations
- ccxt, Postgres cache, git version, cookie helpers
- replaceable without changing the domain layer

`workers`

- run explicit tasks
- use the same use cases as the API
- do not implement alternative business logic

`frontend`

- contains UI modules with clear boundaries
- moves inline script logic out of the template
- uses stable JSON contracts from the API

## Component boundaries

### A. Exchange Gateway

Gainium uses a dedicated exchange connector for this. For Trade Wijs, the first step is an internal gateway interface.

Contract:

- `get_supported_symbols(exchange_key)`
- `get_supported_timeframes(exchange_key)`
- `get_supported_quote_currencies(exchange_key)`
- `get_market_constraints(exchange_key, symbol)`
- `get_ticker(exchange_key, symbol)`
- `get_ohlcv(exchange_key, symbol, timeframe, limit)`

Implementation 1:

- `CcxtExchangeGateway`

Benefits:

- ccxt dependency exists in one place only
- worker and web layers share the same contract
- can later be replaced by a separate process or service

### B. Cache Gateway

Cache behavior is currently intertwined with payload assembly. That should move behind its own boundary.

Contract:

- `get_market_snapshot(...)`
- `put_market_snapshot(...)`
- `get_chart_payload(...)`
- `put_chart_payload(...)`
- `get_exchange_settings(...)`
- `put_exchange_settings(...)`

Implementation 1:

- `PostgresCacheRepository`

Benefits:

- cache policy becomes explicit
- use cases decide when cache is used
- storage technology remains swappable

### C. Frontend Modules

The current template should be split into dedicated client modules.

Minimum frontend boundaries:

- `bootstrap.js`: reads server data and starts the app
- `api-client.js`: all fetch calls to `/api/*`
- `chart-engine.js`: chart rendering and lifecycle
- `pane-layout.js`: layout, drag, and scale behavior
- `settings-store.js`: local preferences and persistence
- `selectors.js`: exchange, pair, and timeframe interactions
- `tabs.js`: market tabs and active context
- `horizontal-line.js` and `trend-line.js`: drawing tools

Benefits:

- lower regression risk for UI changes
- enables targeted testing
- prepares for optional frontend extraction later

## Recommended container target

Do not implement immediately, but design toward this:

```text
docker-compose
  web
  worker-market-snapshots
  worker-exchange-settings
  worker-chart-warmer
  db
```

Optional later step:

```text
docker-compose
  web
  exchange-gateway
  indicator-service
  worker-market-snapshots
  worker-exchange-settings
  worker-chart-warmer
  db
```

Important: enforce internal boundaries first, then split runtime components.

## Mapping Gainium to Trade Wijs

| Gainium pattern | Trade Wijs equivalent | When to apply |
| --- | --- | --- |
| `docker-sh` as composition | `docker-compose.yml` as component orchestration | after internal module separation |
| `exchange-connector-sh` | `adapters/exchange/ccxt_gateway.py` and optionally a separate service later | early |
| `websocket-connector-sh` | not needed yet, only when true realtime streaming is required | later |
| `indicators` as library | `domain/indicators` or separate indicator service | medium |
| multiple role-based workers | `workers/*.py` per task | early |

## Phased migration path

### Phase 1. Package structure without behavior change

Goal:

- move files into target folders
- normalize imports
- keep temporary compatibility

Actions:

- create `trade_wijs/` as the main package
- move `app_services_config.py` to `shared/config.py`
- move `db_cache.py` to `adapters/cache/postgres_cache.py`
- move exchange helpers to `adapters/exchange/ccxt_gateway.py`
- keep `app.py` temporarily as a thin entrypoint

Outcome:

- code is logically grouped
- behavior remains unchanged

### Phase 2. Thin routes

Goal:

- let Flask routes only handle input and output

Actions:

- move route implementations to `api/routes/`
- create use cases for chart, quote, and settings
- let routes call use cases only

Outcome:

- business logic leaves the web layer

### Phase 3. Introduce exchange and cache contracts

Goal:

- place infrastructure behind interfaces

Actions:

- define gateway and repository contracts
- implement ccxt and Postgres adapters
- let use cases work through those contracts only

Outcome:

- less direct coupling between domain and infrastructure

### Phase 4. Worker split

Goal:

- decouple background tasks

Actions:

- split `worker.py` into three workers
- reuse the same application use cases
- give each worker its own entrypoint and compose service

Outcome:

- better fault isolation
- more targeted scalability

### Phase 5. Move frontend logic out of template

Goal:

- modularize UI state and chart behavior

Actions:

- keep server-rendered HTML
- move inline JavaScript to `frontend/static/js/*`
- keep bootstrap data small and explicit

Outcome:

- much lower complexity in `index.html`
- preparation for optional SPA or separate frontend later

### Phase 6. Remove compatibility layer

Goal:

- enforce architecture boundaries

Actions:

- remove broad re-exports in `app_services.py`
- import only through target modules
- define and lock public interfaces

Outcome:

- real module boundaries instead of cosmetic splitting

### Phase 7. Optional service extraction

Only execute when there is a concrete reason.

Possible reasons:

- ccxt calls block the web layer too much
- indicator calculations become CPU-heavy
- separate deploy cycles become useful
- multiple clients need to share the same market services

Then evaluate these parts first:

- exchange gateway
- indicator service
- realtime stream service

## What not to do now

- do not add RabbitMQ, Redis, or extra infrastructure without a real scaling problem
- do not replace backend and frontend stacks at the same time
- do not call everything microservices while module boundaries are still weak
- do not keep adding new features to broad template/service files

## First concrete refactor step

The best first technical step in this repository is:

1. extract exchange access and cache from `app_services_payloads.py`
2. split `worker.py` into three separate entrypoints
3. move inline JavaScript out of `templates/index.html` into separate files

This provides immediate modularity gains without making the application unnecessarily heavy.
