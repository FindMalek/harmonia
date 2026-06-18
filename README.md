# Harmonia

> AI-powered music organization — sync your Spotify library, classify every track, and auto-generate playlists by mood, theme, and vibe.

## What it does

1. **Sync** — pulls your full Spotify saved tracks + playlists
2. **Classify** — runs each track through an LLM to extract mood, themes, vibe, energy, era, and genre
3. **Embed** — generates semantic vector embeddings from the classification
4. **Cluster** — groups tracks by similarity using DBSCAN
5. **Generate** — creates AI-named playlists per cluster, enforcing artist diversity
6. **Export** — pushes playlists back to Spotify

## Stack

| Layer | Technology |
|---|---|
| Apps | Next.js 15 (App Router), React 19 |
| API | oRPC (type-safe RPC + OpenAPI) |
| Auth | Better Auth + Spotify OAuth |
| Database | PostgreSQL + Drizzle ORM (Neon in production) |
| Background jobs | Trigger.dev v4 |
| LLM | Groq (`llama-3.3-70b-versatile` classify; `gpt-oss-120b` playlist/cluster) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Clustering | DBSCAN (`density-clustering`) |
| Monorepo | pnpm + Turborepo |
| Formatting | Biome |

## Repo Structure

```
apps/
  api         Next.js API server (port 3002)
  dashboard   Authenticated user dashboard (port 3003)
  web         Public-facing pages (port 3001)
  admin       Internal admin dashboard (port 3004)

packages/
  auth        Better Auth + Spotify OAuth
  common      Schemas, services, Trigger.dev tasks
  config      Shared TypeScript config
  core        Auth/DB singletons
  db          Drizzle schema + migrations
  env         Zod-validated environment variables
  logger      Pino structured logging
  orpc        oRPC routers, procedures, context
  tracing     OpenTelemetry
  ui          shadcn/ui component library
```

## Getting Started

**Prerequisites:** Node.js 20+, pnpm 10+, Docker Desktop

```bash
git clone https://github.com/FindMalek/harmonia.git
cd harmonia
pnpm install
cp .env.example .env     # fill in values
pnpm db:setup            # start local Postgres + push schema
pnpm dev:api             # start API + Trigger.dev worker
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup guide.

### Admin dashboard (local)

```bash
pnpm db:push              # apply schema (adds role + banned columns)
pnpm db:seed              # seed admin@harmonia.com / changeme123!
pnpm dev:admin            # admin only (port 3004) — needs API already running
# or
pnpm dev:ada              # API + dashboard + admin together (ports 3002/3003/3004)
```

Open [http://127.0.0.1:3004/login](http://127.0.0.1:3004/login) and sign in with the seeded credentials.

The admin dashboard provides:

- **Stats** — total users, tracks, and waitlist breakdown by status
- **Waitlist** — list, search, filter by status, approve / reject individually or in bulk
- **Users** — list and search all registered users

## Environment Variables

All variables are prefixed `HARMONIA_` (server) or `NEXT_PUBLIC_HARMONIA_` (client). Copy `.env.example` and fill in:

- `HARMONIA_DATABASE_URL` — local: `postgresql://postgres:password@localhost:5433/harmonia`
- `HARMONIA_SPOTIFY_CLIENT_ID` / `HARMONIA_SPOTIFY_CLIENT_SECRET` — from Spotify Developer Dashboard
- `HARMONIA_OPENAI_API_KEY` — for embeddings
- `HARMONIA_GROQ_API_KEY` — for LLM classification and playlist generation
- `HARMONIA_TRIGGER_SECRET_KEY` / `HARMONIA_TRIGGER_PROJECT_REF` — from [cloud.trigger.dev](https://cloud.trigger.dev)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
