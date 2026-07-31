import { sql } from "drizzle-orm";
import {
	index,
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
