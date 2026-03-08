# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Commit overview

- `62dbbb6` `test: align timeframe minimum and add settings exchange controls coverage`
- `635c181` `perf(chart): add full/delta payload mode with cache-aware refresh`

### Highlights

- Timeframe feature expectation changed to at least 1 button instead of a fixed count.
- Added new Gherkin coverage for exchange enable/disable behavior in Settings.
- Added mode-aware chart payload flow (`full` / `delta`) end-to-end:
	- Backend `/api/chart-data` supports `mode` and returns `payload_mode`.
	- Delta payload sends only the latest candles and omits heavy axis/footer arrays.
	- Frontend refresh is delta-first and safely falls back to full refresh when needed.
	- Chart payload cache keys now include payload mode to prevent collisions.
- Warm benchmark on local stack (`localhost:3175`, 8 runs):
	- `full`: ~`2044 ms`, ~`1.53 MB`
	- `delta`: ~`701 ms`, ~`0.45 MB`
	- Improvement: about `65.7%` lower average latency and `70.2%` smaller payload.

### Verification

- [x] CI-relevant tests passed locally (`17 scenarios`, `137 steps`).

---

## Release template (copy for each new release)

```md
## v<x>.<y>.<z> - YYYY-MM-DD

### Commit overview

- `<short-sha>` `<type(scope): subject>`
- `<short-sha>` `<type(scope): subject>`
- `<short-sha>` `<type(scope): subject>`

### Highlights

- 

### Verification

- [ ] Critical flows tested
- [ ] CI green
- [ ] Container smoke test passed
```

## How to collect commits per release

Use one of these commands and paste the output under the release section.

```bash
# Between two tags
git log --oneline v<x>.<y>.<z-1>..v<x>.<y>.<z>

# From previous tag to current HEAD (pre-release)
git log --oneline <previous-tag>..HEAD
```
