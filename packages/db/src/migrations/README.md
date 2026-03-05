# Database Migrations

## pgvector (H-001)

The first migration enables the pgvector extension for vector similarity search (track embeddings).

**To run migrations:**

1. Ensure `apps/web/.env` exists with `DATABASE_URL` (Neon PostgreSQL connection string).
2. Run from repo root:
   ```bash
   pnpm db:migrate
   ```
   Or if turbo is unavailable:
   ```bash
   pnpm db:migrate:direct
   ```

**Verify pgvector:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```
