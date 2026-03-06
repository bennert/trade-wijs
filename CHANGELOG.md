# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Commit overview

- `62dbbb6` `test: align timeframe minimum and add settings exchange controls coverage`

### Highlights

- Timeframe feature expectation changed to at least 1 button instead of a fixed count.
- Added new Gherkin coverage for exchange enable/disable behavior in Settings.

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
