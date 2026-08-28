import type { db } from "@harmonia/db";
import type { logger } from "@harmonia/logger";

export type OpsStatus = "running" | "completed" | "failed";

export type MigrationAction =
	| "skip"
	| "run"
	| "abort_in_progress"
	| "checksum_mismatch";

export type OpsLedgerRow = {
	name: string;
	status: OpsStatus;
	checksum: string;
	attempts: number;
	startedAt: Date | null;
	completedAt: Date | null;
	error: string | null;
};

export type RunOptions = {
	dryRun?: boolean;
	only?: string;
};

export type DbOpsContext = {
	db: typeof db;
	log: typeof logger;
	dryRun: boolean;
};

export type MigrationModule = {
	up: (ctx: DbOpsContext) => Promise<void>;
};

export const STALE_RUNNING_MS = 30 * 60 * 1000;

export const MIGRATION_FILENAME_RE = /^\d{14}-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;

export const ADVISORY_LOCK_KEY = "harmonia_db_ops_runner";
