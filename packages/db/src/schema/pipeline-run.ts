import {
	index,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export type PipelineProgress = {
	sync?: Record<string, unknown>;
	lyrics?: Record<string, unknown>;
	classify?: Record<string, unknown>;
	embed?: Record<string, unknown>;
	cluster?: Record<string, unknown>;
	generate?: Record<string, unknown>;
	export?: Record<string, unknown>;
};

export const pipelineRun = pgTable(
	"pipeline_run",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status").notNull().default("pending"),
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
	],
);
