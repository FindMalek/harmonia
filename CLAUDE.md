# Harmonia — Claude Code Context

## What this is

Harmonia is a music organization app that syncs a user's Spotify library, classifies tracks with AI, clusters them by similarity, and auto-generates playlists. It is a **pnpm + Turborepo monorepo** with three Next.js apps and a set of shared packages.

---

## Monorepo layout

```
apps/
  api         Next.js API server (port 3002) — oRPC, Better Auth, Trigger.dev webhook
  dashboard   Next.js dashboard (port 3003) — authenticated user UI
  web         Next.js web app   (port 3001) — public-facing pages

packages/
  auth        Better Auth singleton + Spotify OAuth config
  common      Shared schemas, types, services, Trigger.dev task definitions
  config      Shared tsconfig.base.json
  core        Initialises auth; re-exports the singleton for the whole monorepo
  db          Drizzle ORM schema + migrations + DB client
  env         Zod-validated env presets (never use process.env directly — see below)
  logger      Pino structured logger
  orpc        oRPC routers, procedures, context, and client
  tracing     OpenTelemetry instrumentation
  ui          shadcn/ui component library + shared Tailwind config
```

---

## Dev commands

```bash
pnpm dev:api          # API + Trigger.dev worker (most common)
pnpm dev:ad           # API + dashboard + Trigger.dev worker
pnpm dev:all          # all three apps + Trigger.dev worker
pnpm dev:web          # web app only (no Trigger.dev)

pnpm db:push          # push Drizzle schema to local Postgres
pnpm db:studio        # open Drizzle Studio UI
pnpm db:generate      # generate migration files
pnpm db:migrate       # run migrations (production)
pnpm db:setup         # start local Docker Postgres + push schema

pnpm trigger:dev      # start Trigger.dev worker alone (maps HARMONIA_TRIGGER_* → TRIGGER_*)
pnpm check-types      # run tsc --noEmit across all packages
pnpm check            # Biome check + fix
pnpm lint             # Biome lint + fix
pnpm format           # Biome format + fix
```

---

## Hard rules (things that have burned us before)

1. **Never `process.env` directly.** Always import from `@harmonia/env/server` or the app-specific preset. The env package validates at startup and provides typed access.

2. **Never the default `groq()` factory from `@ai-sdk/groq`.** Use `createGroq({ apiKey: env.HARMONIA_GROQ_API_KEY })`. The default reads `GROQ_API_KEY` which is not set — only `HARMONIA_GROQ_API_KEY` is.

3. **Never write to the full `progress` column directly in a concurrent context.** Use `updateStageProgress(runId, stage, value)` which uses the Postgres JSONB `||` merge operator so concurrent stages never overwrite each other.

4. **`inngest` is gone.** Background jobs use `@trigger.dev/sdk/v3`. The Trigger.dev dev worker is started automatically by the `dev:api` script via `concurrently`.

5. **The DB driver is conditional.** `packages/db/src/index.ts` uses `@neondatabase/serverless` when the URL contains `.neon.tech`, and standard `pg` otherwise. Do not change this logic.

---

## Environment variables

All env vars are prefixed `HARMONIA_` (server) or `NEXT_PUBLIC_HARMONIA_` (client).

```bash
HARMONIA_DATABASE_URL              # PostgreSQL connection string
HARMONIA_BETTER_AUTH_SECRET        # Better Auth secret
HARMONIA_SPOTIFY_CLIENT_ID/SECRET  # Spotify OAuth
HARMONIA_OPENAI_API_KEY            # OpenAI embeddings
HARMONIA_GROQ_API_KEY              # Groq LLM (classify, metadata, playlists)
HARMONIA_TRIGGER_SECRET_KEY        # Trigger.dev (mapped → TRIGGER_SECRET_KEY by scripts/run-trigger-dev.mjs)
HARMONIA_TRIGGER_PROJECT_REF       # Trigger.dev project ref
HARMONIA_CRON_SECRET               # Cron job auth header
HARMONIA_OTEL_*                    # OpenTelemetry config

NEXT_PUBLIC_HARMONIA_NODE_ENV      # "local" | "development" | "production"
NEXT_PUBLIC_HARMONIA_API_URL       # API base URL
NEXT_PUBLIC_HARMONIA_WEB_URL       # Web app URL
NEXT_PUBLIC_HARMONIA_DASHBOARD_URL # Dashboard URL
NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN # CORS origin (supports wildcards)
```

To add a new env var: add it to `.env.example`, add a Zod schema in the relevant `packages/env/src/modules/*.ts` module, and add it to the appropriate preset in `packages/env/src/presets/`.

---

## Adding an oRPC route

1. Add Zod schemas to `packages/common/src/schemas/{entity}/`
2. Add the handler in `packages/orpc/src/routers/protected/` (or `public/` if no auth needed)
3. Export from the router's `index.ts`
4. The route is automatically available on the client via `@harmonia/orpc/client`

```typescript
// packages/orpc/src/routers/protected/playlists.ts
export const playlistsRouter = {
  list: protectedProcedure
    .input(playlistListInput)
    .output(z.array(playlistListItemSchema))
    .handler(async ({ context }) => {
      return await db.select().from(playlist).where(eq(playlist.userId, context.session.user.id));
    }),
};
```

Procedure hierarchy: `publicProcedure` → `protectedProcedure` → `cronOrAuthProcedure`

---

## Adding a Drizzle schema table

```typescript
// packages/db/src/schema/my-table.ts
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Then export from `packages/db/src/schema/index.ts` and run `pnpm db:push`.

---

## Adding a Trigger.dev stage task

```typescript
// packages/common/src/trigger/tasks/stages/my-stage.ts
import { task } from "@trigger.dev/sdk/v3";
import { checkCancelled, updateRun, updateStageProgress } from "../../../services/organize";

export const myStageTask = task({
  id: "organize-stage-my-stage",
  retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
  run: async ({ userId, runId }: { userId: string; runId: number }) => {
    await checkCancelled(runId, userId);
    await updateRun(runId, { currentStage: "my-stage" });
    return await myServiceFunction(userId, async (p) => {
      await updateStageProgress(runId, "my-stage", p);
    });
  },
});
```

Then export from `apps/api/src/trigger/organize.ts` and add `.triggerAndWait()` in the parent `organize-pipeline` task.

---

## Code style

- **Formatter**: Biome — tabs for indentation, double quotes, auto-organised imports
- **Linting**: Biome recommended + strict style rules (`noParameterAssign`, `useAsConstAssertion`, etc.)
- **Tailwind classes**: sorted automatically by Biome (`clsx`, `cva`, `cn` functions)
- **TypeScript**: strict mode, `noUncheckedIndexedAccess`, `noUnusedLocals`
- **Commits**: `feat:`, `fix:`, `chore:`, `perf:`, `refactor:` prefixes
- **No comments** unless the WHY is non-obvious

---

## Key package imports

```typescript
import { db } from "@harmonia/db";
import { track } from "@harmonia/db/schema/track";
import { env } from "@harmonia/env/server";           // server-side env
import { auth } from "@harmonia/core";                 // Better Auth singleton
import { logger } from "@harmonia/logger";             // Pino logger
import { protectedProcedure } from "@harmonia/orpc";  // oRPC procedures
import { organizePipeline } from "@harmonia/common/trigger/tasks/organize";
```

Within each app, use `@/*` for local imports:
```typescript
import { Button } from "@/components/ui/button";
import { useOrganize } from "@/hooks/mutations/use-organize";
```
