import {
	index,
	integer,
	jsonb,
	pgTable,
	real,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { pipelineRun } from "./pipeline-run";

export const externalApiCall = pgTable(
	"external_api_call",
	{
		id: serial("id").primaryKey(),

		// userId is nullable — Spotify token-refresh calls run before a user
		// session is fully resolved.
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		// SET NULL so audit rows survive run deletion.
		pipelineRunId: integer("pipeline_run_id").references(() => pipelineRun.id, {
			onDelete: "set null",
		}),

		provider: text("provider").notNull(), // 'spotify' | 'lrclib' | 'openai' | 'groq'
		endpoint: text("endpoint").notNull(), // REST path (e.g. '/me/tracks') or model ID for AI providers
		method: text("method").notNull().default("GET"),

		// Auth headers stripped before this is ever set; large fields replaced with counts.
		requestPayload: jsonb("request_payload").$type<Record<string, unknown>>(),

		httpStatus: integer("http_status"),
		// Capped at ~10 KB at insertion — see truncatePayload in external-api-log.ts.
		responsePayload: jsonb("response_payload").$type<Record<string, unknown>>(),
		durationMs: integer("duration_ms"),
		errorMessage: text("error_message"),

		// Computed at write time from responsePayload.usage against the static
		// pricing table (packages/common/src/constants/pricing.ts). Null for
		// calls with no per-token pricing (Spotify, LRCLib — not token-billed)
		// or missing/malformed usage data.
		costUsd: real("cost_usd"),

		// Denormalized status bucket for O(1) dashboard WHERE clauses (no CASE
		// in every query): 'success' | 'rate_limited' | 'not_found' |
		// 'client_error' | 'server_error' | 'error'
		statusCategory: text("status_category").notNull(),

		// 0 = first attempt, 1+ = retry number
		retryAttempt: integer("retry_attempt").notNull().default(0),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("eac_user_id_idx").on(table.userId),
		index("eac_pipeline_run_id_idx").on(table.pipelineRunId),
		index("eac_provider_idx").on(table.provider),
		index("eac_status_category_idx").on(table.statusCategory),
		index("eac_created_at_idx").on(table.createdAt),
		// compound — "spotify calls in the last 24 h"
		index("eac_provider_created_at_idx").on(table.provider, table.createdAt),
		// compound — "all errors for user X"
		index("eac_user_status_idx").on(table.userId, table.statusCategory),
	],
);
