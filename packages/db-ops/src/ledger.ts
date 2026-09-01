import type { db } from "@sonaraem/db";
import { sql } from "drizzle-orm";

import type { MigrationAction, OpsLedgerRow, OpsStatus } from "./types";
import { STALE_RUNNING_MS } from "./types";

type Db = typeof db;

export function resolveMigrationAction(
	row: Pick<OpsLedgerRow, "status" | "checksum" | "startedAt"> | null,
	fileChecksum: string,
	now: Date,
	staleRunningMs = STALE_RUNNING_MS,
): MigrationAction {
	if (!row) return "run";
	if (row.status === "completed") {
		if (row.checksum !== fileChecksum) return "checksum_mismatch";
		return "skip";
	}
	if (row.status === "failed") return "run";
	if (row.status === "running") {
		if (!row.startedAt) return "run";
		const elapsed = now.getTime() - row.startedAt.getTime();
		if (elapsed >= staleRunningMs) return "run";
		return "abort_in_progress";
	}
	return "run";
}

function mapLedgerRow(row: Record<string, unknown>): OpsLedgerRow {
	return {
		name: String(row.name),
		status: row.status as OpsStatus,
		checksum: String(row.checksum),
		attempts: Number(row.attempts),
		startedAt: row.started_at ? new Date(String(row.started_at)) : null,
		completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
		error: row.error != null ? String(row.error) : null,
	};
}

export async function ensureOpsTable(dbClient: Db): Promise<void> {
	await dbClient.execute(sql`
		CREATE TABLE IF NOT EXISTS sonaraem_db_ops (
			name text PRIMARY KEY,
			status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
			checksum text NOT NULL,
			attempts int NOT NULL DEFAULT 0,
			started_at timestamptz,
			completed_at timestamptz,
			error text
		)
	`);
	await dbClient.execute(sql`
		CREATE INDEX IF NOT EXISTS sonaraem_db_ops_status_idx ON sonaraem_db_ops (status)
	`);
}

export async function acquireAdvisoryLock(dbClient: Db): Promise<void> {
	await dbClient.execute(
		sql`SELECT pg_advisory_lock(hashtext('sonaraem_db_ops_runner'))`,
	);
}

export async function releaseAdvisoryLock(dbClient: Db): Promise<void> {
	await dbClient.execute(
		sql`SELECT pg_advisory_unlock(hashtext('sonaraem_db_ops_runner'))`,
	);
}

export async function getLedgerRow(
	dbClient: Db,
	name: string,
): Promise<OpsLedgerRow | null> {
	const result = await dbClient.execute(sql`
		SELECT name, status, checksum, attempts, started_at, completed_at, error
		FROM sonaraem_db_ops
		WHERE name = ${name}
	`);
	const rows = result.rows as Record<string, unknown>[];
	const row = rows[0];
	if (!row) return null;
	return mapLedgerRow(row);
}

export async function listLedgerRows(dbClient: Db): Promise<OpsLedgerRow[]> {
	const result = await dbClient.execute(sql`
		SELECT name, status, checksum, attempts, started_at, completed_at, error
		FROM sonaraem_db_ops
		ORDER BY name
	`);
	return (result.rows as Record<string, unknown>[]).map(mapLedgerRow);
}

export async function getLedgerRowSafe(
	dbClient: Db,
	name: string,
): Promise<OpsLedgerRow | null> {
	try {
		return await getLedgerRow(dbClient, name);
	} catch (err) {
		if (
			err &&
			typeof err === "object" &&
			"code" in err &&
			err.code === "42P01"
		) {
			return null;
		}
		throw err;
	}
}

export async function markRunning(
	dbClient: Db,
	name: string,
	checksum: string,
): Promise<void> {
	await dbClient.execute(sql`
		INSERT INTO sonaraem_db_ops (name, status, checksum, attempts, started_at, completed_at, error)
		VALUES (${name}, 'running', ${checksum}, 1, now(), null, null)
		ON CONFLICT (name) DO UPDATE SET
			status = 'running',
			checksum = EXCLUDED.checksum,
			attempts = sonaraem_db_ops.attempts + 1,
			started_at = now(),
			completed_at = null,
			error = null
	`);
}

export async function markCompleted(dbClient: Db, name: string): Promise<void> {
	await dbClient.execute(sql`
		UPDATE sonaraem_db_ops
		SET status = 'completed', completed_at = now(), error = null
		WHERE name = ${name}
	`);
}

export async function markFailed(
	dbClient: Db,
	name: string,
	errorMessage: string,
): Promise<void> {
	await dbClient.execute(sql`
		UPDATE sonaraem_db_ops
		SET status = 'failed', error = ${errorMessage}
		WHERE name = ${name}
	`);
}
