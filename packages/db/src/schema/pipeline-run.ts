import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Canonical pipeline run lifecycle — single source of truth.
 *
 * The DB column is plain `text` (no enum type, to keep migrations cheap), but
 * its TS type is narrowed here so every read/write is type-checked against the
 * valid set. `@harmonia/common/schemas/pipeline/enum.ts` derives its Zod enum
 * from these values.
 *
 * - `pending`   : run row created, task not yet picked up
 * - `running`   : task executing a stage
 * - `completed` : every stage produced expected output
 * - `partial`   : finished but with significant data loss (re-run recommended)
 * - `failed`    : a stage threw an unrecoverable error
 * - `cancelled` : user cancelled via `pipeline.cancel`
 */
export const PIPELINE_STATUS_VALUES = [
	"pending",
	"running",
	"completed",
	"partial",
	"failed",
	"cancelled",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUS_VALUES)[number];

/** Pipeline stage progress. Typed definitions live in @harmonia/common/types. */
export type PipelineProgress = {
	sync?: { total: number; done: boolean };
	lyrics?: {
		found: number;
		notFound: number;
		processed: number;
		total: number;
	};
	classify?: { classified: number; total: number; pending: number };
	embed?: { embedded: number; total: number; pending: number };
	cluster?: { clusters: number; noise: number; totalTracks: number };
	generate?: {
		playlists: number;
		tracksOrganized: number;
		updatedPlaylistIds?: number[];
		createdPlaylists?: Array<{ id: number; name: string }>;
	};
	export?: Record<string, unknown>;
};

export const pipelineRun = pgTable(
	"pipeline_run",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status").$type<PipelineStatus>().notNull().default("pending"),
		triggeredBy: text("triggered_by").$type<"user" | "cron">(),
		currentStage: text("current_stage"),
		progress: jsonb("progress").$type<PipelineProgress>().default({}),
		error: text("error"),
		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		// Last heartbeat from a client actively watching this run (manual path only) — null/stale means send the completion email, recent means they're still here and can see it themselves.
		lastClientSeenAt: timestamp("last_client_seen_at"),
	},
	(table) => [
		index("pipeline_run_user_id_idx").on(table.userId),
		index("pipeline_run_status_idx").on(table.status),
		// At most one "running" row per user — prevents overlapping triggers from racing to update the same playlists.
		uniqueIndex("pipeline_run_one_running_per_user")
			.on(table.userId)
			.where(sql`${table.status} = 'running'`),
	],
);

/**
 * Real wall-clock duration of each completed stage — feeds the ETA estimate
 * (#283). One row per stage per run, written once the stage finishes.
 * trackCount is the item count that stage actually processed (null for
 * stages without a clean per-item cost model, e.g. cluster/generate/match/
 * export) — used to derive a historical seconds-per-track rate; stages
 * without one fall back to a flat historical average duration instead.
 */
export const pipelineStageTiming = pgTable(
	"pipeline_stage_timing",
	{
		id: serial("id").primaryKey(),
		runId: integer("run_id")
			.notNull()
			.references(() => pipelineRun.id, { onDelete: "cascade" }),
		stage: text("stage").notNull(),
		trackCount: integer("track_count"),
		startedAt: timestamp("started_at").notNull(),
		completedAt: timestamp("completed_at").notNull(),
	},
	(table) => [index("pipeline_stage_timing_stage_idx").on(table.stage)],
);
