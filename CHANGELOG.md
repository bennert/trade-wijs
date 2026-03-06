# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Commit overview

- _No commits listed yet for the next release cycle._

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
