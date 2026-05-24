# Preview Environment Checklist

## ✅ Already Done

- Vercel projects exist (`harmonia-api`, `harmonia-dashboard`)
- PR deployments auto-trigger in Vercel
- Production database migrations work

## 🔧 Just Fixed

1. **cleanup-preview.yml** - Added workflow to delete Neon branches when PRs close
2. **drizzle-migrate.yml** - Fixed migration workflow:
   - Removed incorrect `schema/**` trigger (migrations are pre-generated)
   - Added 10-minute timeout
   - Added failure notification

## ❌ Still Missing (Blocking Preview with Separate DBs)

### Issue 1: No Per-PR Database
**Problem:** All PR previews use the production database
**Solution:** Create `preview-create-db.yml` to:
```yaml
on:
  pull_request:
    types: [opened, synchronize]
```
This should:
1. Create Neon branch: `preview/{github.head_ref}`
2. Run `pnpm db:migrate` with that branch's connection string
3. Set Vercel env var: `HARMONIA_DATABASE_URL` = preview branch URL

### Issue 2: No Per-PR API Endpoint
**Problem:** Dashboard in PR always calls `https://api.harmonia.malek.engineering` (production)
**Solution:** Either:
- **Option A:** Route via Vercel's automatic branch aliasing
  - API URL: `https://harmonia-api-{branch-name}-{team}.vercel.app`
- **Option B:** Use Neon branch as routing key to pick the right API

### Issue 3: GitHub Secrets Missing
**Required:**
- `NEON_API_KEY` - from https://console.neon.tech/app/settings/api-keys
- `NEON_PROJECT_ID` - from Neon project dashboard (also set as variable)

## Implementation Priority

### Tier 1 (Unblocks preview with isolation)
1. Get Neon credentials → add GitHub secrets
2. Create `preview-create-db.yml` workflow
3. Test with a PR

### Tier 2 (Makes preview usable)
4. Update dashboard `NEXT_PUBLIC_HARMONIA_API_URL` logic
5. Configure Vercel env var per-preview

### Tier 3 (Polish)
6. Add PR comment with preview URLs
7. Monitor for failed Neon branch creation

## File References

- **Cleanup workflow:** `.github/workflows/cleanup-preview.yml` (✅ done)
- **Migration workflow:** `.github/workflows/drizzle-migrate.yml` (✅ fixed)
- **Full guide:** `PREVIEW_SETUP.md` (📖 read this)
- **Compare with:** https://github.com/FindMalek/dukkani/tree/main/.github/workflows

## Expected Result

```
User opens PR #42 → 
  ✅ GitHub creates Neon branch: preview/fix-bug
  ✅ GitHub runs migrations on that branch
  ✅ Vercel deploys preview with isolated DB
  ✅ Vercel sets NEXT_PUBLIC_HARMONIA_API_URL to preview API
  ✅ Dashboard preview connects to preview API, which connects to preview DB
  ✅ Test in isolation
→ PR closes →
  ✅ GitHub deletes Neon branch preview/fix-bug
  ✅ Vercel cleans up preview deployment
```
