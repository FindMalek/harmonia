# Preview Environment Setup Guide

This guide explains how to set up per-PR preview environments with separate databases and API endpoints, matching Dukkani's architecture.

## Current Status

✅ **Working:**
- Vercel preview deployments deploy on every PR push
- `harmonia-api` and `harmonia-dashboard` projects exist in Vercel

❌ **Missing:**
- Per-PR Neon database branches (all PRs use production DB)
- Per-PR API endpoints (all PRs point to production API)
- Cleanup of Neon branches when PRs close (`cleanup-preview.yml` just added)

## What Needs to Be Done

### 1. Set Up Neon (Database) for Preview Branches

**Step 1: Get Neon API Key & Project ID**
- Go to https://console.neon.tech → Settings → API keys
- Create a new API key (or copy existing)
- Copy your Project ID (visible in project URL: `https://console.neon.tech/app/projects/{PROJECT_ID}`)

**Step 2: Add GitHub Secrets** (Repo → Settings → Secrets and variables → Actions)
- `NEON_API_KEY` = your Neon API key
- `NEON_PROJECT_ID` = your project ID (also set as a variable)

**Step 3: Create a GitHub Action for Preview DB** (not yet implemented)
Need to add a workflow that:
- Creates a new Neon branch for each PR with name `preview/{branch-name}`
- Runs migrations on that branch
- Outputs the branch connection string as an env var for Vercel

**Example workflow structure** (see Dukkani's for reference):
```yaml
- Create Neon branch via API
- Run drizzle-kit migrate with that branch's DATABASE_URL
- Expose HARMONIA_DATABASE_URL environment variable to Vercel
```

### 2. Update Vercel Environment Variables

For **each preview deployment**, Vercel needs:
- `HARMONIA_DATABASE_URL` = PR-specific Neon branch connection string
- `NEXT_PUBLIC_HARMONIA_API_URL` = PR-specific API preview URL

**Currently:** both use production hardcoded values.

**Solution:** Use Vercel's automatic `GITHUB_HEAD_REF` to route to per-PR resources:
- API: `https://harmonia-api-{branch-name}-{team}.vercel.app`
- Dashboard connects to: `https://harmonia-api-{branch-name}-{team}.vercel.app`

### 3. Update Dashboard Environment Variables

In `apps/dashboard/src/app/layout.tsx` or config, dynamically set:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_HARMONIA_API_URL || 
  (process.env.VERCEL_GIT_COMMIT_REF && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_GIT_COMMIT_REF}-harmonia-api.vercel.app`
    : 'https://api.harmonia.malek.engineering')
```

Or use Vercel's preview URL routing directly.

## Implementation Checklist

- [ ] **Neon Setup**
  - [ ] Get NEON_API_KEY and NEON_PROJECT_ID
  - [ ] Add GitHub secrets: `NEON_API_KEY`, `NEON_PROJECT_ID`
  - [ ] Create Neon branch creation workflow (triggered on PR open/synchronize)

- [ ] **Database Migrations on Preview Branches**
  - [ ] Run `drizzle-kit migrate` against preview DB branch
  - [ ] Fail workflow if migrations fail

- [ ] **Vercel Environment Variables**
  - [ ] Set `HARMONIA_DATABASE_URL` per-preview in Vercel
  - [ ] Set `NEXT_PUBLIC_HARMONIA_API_URL` to point to preview API URL

- [ ] **Dashboard Configuration**
  - [ ] Update API URL logic to use preview URL when on a PR

- [ ] **Cleanup**
  - [ ] Verify `cleanup-preview.yml` deletes Neon branches on PR close ✅ (just added)

## Key Differences from Dukkani

Dukkani uses:
- **Prisma** with automatic migration deploy
- **R2** for file storage (cleanup on PR close)
- **Neon** for per-PR database branches

Harmonia should use:
- **Drizzle** with explicit `pnpm db:migrate`
- (No file storage in preview yet)
- **Neon** for per-PR database branches (same as Dukkani)

## References

- Dukkani Cleanup: https://github.com/FindMalek/dukkani/blob/main/.github/workflows/cleanup-preview.yml
- Dukkani Lighthouse CI (resolves preview URL): https://github.com/FindMalek/dukkani/blob/main/.github/workflows/lighthouse-ci.yml
- Neon GitHub Action: https://github.com/neondatabase/delete-branch-action

## Next Steps

1. Set up Neon API credentials in GitHub
2. Create a new workflow: `preview-setup.yml` to:
   - Create Neon branch for each PR
   - Run migrations
   - Pass DB URL to Vercel preview
3. Update Vercel environment variable strategy
4. Test with a PR to verify per-PR database isolation
