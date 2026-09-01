---
name: trigger-dev
description: Trigger.dev v3 background jobs in this monorepo. Use when editing Trigger tasks, calling tasks.trigger, trigger.config.ts, SONARAEM_TRIGGER_* env vars, or pipeline stage subtasks.
---

# Trigger.dev (Sonaraem)

Background work runs on [Trigger.dev](https://trigger.dev) v3. Do **not** use Inngest patterns here; tasks are defined with `@trigger.dev/sdk` and executed via `*.trigger()`.

## Layout

- **`apps/api/trigger.config.ts`** — `project` ref (`SONARAEM_TRIGGER_PROJECT_REF`), task directories, retries.
- **`packages/common/src/trigger/tasks/`** — task implementations (e.g. organize pipeline and per-stage children).

## Environment

- **`SONARAEM_TRIGGER_SECRET_KEY`** — API secret (validated in `@sonaraem/env` for the API preset).
- **`SONARAEM_TRIGGER_PROJECT_REF`** — project slug/ref from the Trigger dashboard.

Local CLI expects `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_REF`; **`pnpm trigger:dev`** loads root `.env` and maps from the `SONARAEM_*` names when the legacy vars are unset (`scripts/run-trigger-dev.mjs`).

## Conventions

- Prefer **idempotent stages** and **explicit `runId` / `userId` payload** so ORPC and cron enqueue paths stay aligned with `pipeline_run` rows.
- On **enqueue failure**, update the pipeline run row to `failed` so nothing stays stuck in `running`.

## References

- Trigger.dev docs: tasks, retries, and dev CLI — https://trigger.dev/docs
