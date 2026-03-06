# Trade Wijs Release Process

## Changelog

- Use [CHANGELOG.md](CHANGELOG.md) to keep a per-release commit overview.

## Version format

- Work version (features/fixes): `v<x>.<y>.<z>+<commitID>`
- Official release tag: `v<x>.<y>.<z>`

Examples:
- Feature work commit: `v0.4.0+8f817a0`
- Fix work commit: `v0.4.1+1a2b3c4`
- Official release: `v0.4.1`

## SemVer rules

- Feature (non-breaking): bump `y`, reset `z=0`
- Fix: bump `z`
- Breaking change: bump `x`, reset `y=0`, `z=0`
- Release moment: remove `+<commitID>` and tag `v<x>.<y>.<z>`

## Release checklist

### 1) Prepare

- Confirm target release number (`v<x>.<y>.<z>`)
- Confirm current app version output is correct
- Update changelog/release notes draft

### 2) Validate

- Run critical user flows
  - timeframe switching
  - horizontal line draw/select/move/duplicate/delete
  - pair/exchange selection and persistence after refresh
- Run automated tests used in CI
- Perform a quick container smoke test

### 3) Tag and publish

- Create annotated tag:

```bash
git tag -a v<x>.<y>.<z> -m "Release v<x>.<y>.<z>"
git push origin v<x>.<y>.<z>
```

- Publish release notes for the same tag

### 4) Start next cycle

- Continue with work versions:
  - next fix: `v<x>.<y>.<z+1>+<commitID>`
  - next feature: `v<x>.<y+1>.0+<commitID>`

## Release notes template

Use this template for each release:

```md
# v<x>.<y>.<z> - YYYY-MM-DD

## Features
- 

## Fixes
- 

## Improvements
- 

## Known issues
- 

## Verification
- [ ] Critical flows tested
- [ ] CI green
- [ ] Container smoke test passed
```
