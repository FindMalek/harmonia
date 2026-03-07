---
name: ci-pipeline
description: Enforce CI pipeline conventions for your application. Use when adding CI checks, modifying GitHub Actions workflows, discussing CI vs deployment, or working with scripts/ci.sh. Prevents deployment steps in CI and ensures the extensible step pattern is followed.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# CI Pipeline Skill

## When This Skill Activates

This skill automatically activates when you:
- Add or modify CI checks or steps
- Edit `.github/workflows/ci.yml`
- Edit `scripts/ci.sh`
- Discuss deployment in the context of CI
- Add a new linting, testing, or validation step

## Architecture: CI vs Deployment

```
GitHub Actions (.github/workflows/ci.yml)  →  Quality gate ONLY
Vercel Git Integration                      →  All deployments
```

**NEVER** add deployment commands to GitHub Actions. Vercel handles deployment automatically via Git Integration (preview on PR, production on merge to main).

## Core Rules

### 1. Use `run_step` for New CI Checks

All CI steps go in `scripts/ci.sh` using the `run_step` function:

```bash
# CORRECT — one line in scripts/ci.sh
run_step "My New Check" ./scripts/my-check.sh

# WRONG — inline in package.json
"ci": "... && ./scripts/my-check.sh && ..."
```

### 2. Order Steps Cheapest-First

Steps run sequentially and fail fast. Put fast/cheap checks before slow/expensive ones:

```
1. Lint & Format (seconds)        ← cheapest
2. Convention checks (seconds)
3. TypeScript Typecheck (minutes)
4. Tests (minutes)                ← most expensive
```

### 3. Mirror Steps in GitHub Actions

Every `run_step` in `scripts/ci.sh` MUST have a corresponding step in `.github/workflows/ci.yml` with:
- A descriptive `name:` matching the step name
- An `id:` for summary reporting
- The same command

```yaml
# CORRECT
- name: "My New Check"
  id: my-check
  run: ./scripts/my-check.sh

# WRONG — missing id
- name: "My New Check"
  run: ./scripts/my-check.sh
```

### 4. Update the Summary Step

When adding a new check, add it to the summary step in `ci.yml`:

```yaml
echo "| My New Check | ${{ steps.my-check.outcome == 'failure' && 'FAIL' || 'PASS' }} |" >> $GITHUB_STEP_SUMMARY
```

### 5. NEVER Add Deployments to CI

```yaml
# WRONG — deployment in GitHub Actions
- name: Deploy to Vercel
  run: vercel --prod

# WRONG — deploy script in CI
run_step "Deploy" bun run deploy:web
```

Vercel deploys automatically. There is no deployment step anywhere in CI.

## Performance Rules

### MUST: Use `find -prune` in lint scripts

```bash
# WRONG — walks into node_modules then filters (25s)
find . -name "X" -not -path "*/node_modules/*"

# RIGHT — never enters node_modules at all (0.3s)
find . \( -path "*/node_modules" -o -path "*/.next" \) -prune -o -name "X" -print
```

### MUST: Enable incremental compilation

All new `tsconfig.json` files MUST include `"incremental": true`:

```json
{
  "compilerOptions": {
    "incremental": true,
    ...
  }
}
```

### MUST: Enable Turbo caching for new tasks

New CI-related Turbo tasks MUST set `"cache": true` in `turbo.json`.

## NEVER Rules

- NEVER add `vercel deploy`, `vercel --prod`, or any deploy command to CI
- NEVER add deployment-related secrets (VERCEL_TOKEN, etc.) to GitHub Actions
- NEVER inline new checks in `package.json` `ci` script — always use `scripts/ci.sh`
- NEVER put expensive checks before cheap ones
- NEVER skip step IDs in GitHub Actions workflow steps
- NEVER use `continue-on-error: true` on quality gate steps (defeats the purpose)
- NEVER use `find -not -path` to exclude directories — use `-prune` instead
- NEVER create a `tsconfig.json` without `"incremental": true`

## Adding a New CI Step — Checklist

1. Create the check script (e.g., `scripts/my-check.sh`) or identify the command
2. Add `run_step "Step Name" command` to `scripts/ci.sh` in the correct position (cheapest-first)
3. Add a matching step with `id:` to `.github/workflows/ci.yml`
4. Add the step to the summary in `ci.yml`
5. Update `.github/AGENTS.md` pipeline step list
6. Test locally with `bun run ci`

## Key Files

| File | Purpose |
|------|---------|
| `scripts/ci.sh` | CI orchestration script (source of truth for steps) |
| `.github/workflows/ci.yml` | GitHub Actions workflow (mirrors steps for PR visibility) |
| `.github/AGENTS.md` | CI/CD quick reference documentation |
| `docs/patterns/ci-pipeline.md` | Pattern doc explaining the architecture |
