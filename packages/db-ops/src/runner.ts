import crypto from "node:crypto";
import fs from "node:fs";

import { logger } from "@harmonia/logger";

import {
	acquireAdvisoryLock,
	ensureOpsTable,
	getLedgerRow,
	markCompleted,
	markFailed,
	markRunning,
	releaseAdvisoryLock,
	resolveMigrationAction,
} from "./ledger";
import {
	listMigrationFiles,
	migrationFilePath,
	migrationImportUrl,
	migrationNameFromFile,
} from "./migrations";
import type { DbOpsContext, MigrationModule } from "./types";

function fileChecksum(filePath: string): string {
	const contents = fs.readFileSync(filePath, "utf-8");
	return crypto.createHash("sha256").update(contents).digest("hex");
}

export async function runMigrations(ctx: DbOpsContext): Promise<void> {
	const { db, log } = ctx;
	await ensureOpsTable(db);
	await acquireAdvisoryLock(db);

	let ran = 0;
	let skipped = 0;

	try {
		const files = listMigrationFiles();
		const now = new Date();

		for (const file of files) {
			const name = migrationNameFromFile(file);
			const filePath = migrationFilePath(file);
			const checksum = fileChecksum(filePath);
			const row = await getLedgerRow(db, name);
			const action = resolveMigrationAction(row, checksum, now);

			if (action === "skip") {
				skipped++;
				log.info({ name }, "db-ops: skip completed migration");
				continue;
			}

			if (action === "checksum_mismatch") {
				throw new Error(
					`db-ops: checksum mismatch for completed migration "${name}" — add a new migration instead of editing a shipped one`,
				);
			}

			if (action === "abort_in_progress") {
				throw new Error(
					`db-ops: migration "${name}" is still running — wait or mark stale runs failed before retrying`,
				);
			}

			log.info({ name, attempt: (row?.attempts ?? 0) + 1 }, "db-ops: running");
			await markRunning(db, name, checksum);

			try {
				const mod = (await import(migrationImportUrl(file))) as MigrationModule;
				if (typeof mod.up !== "function") {
					throw new Error(`db-ops: migration "${name}" must export up()`);
				}
				await mod.up({ db, log });
				await markCompleted(db, name);
				ran++;
				log.info({ name }, "db-ops: completed");
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				await markFailed(db, name, message);
				log.error({ err, name }, "db-ops: failed");
				throw err;
			}
		}

		log.info({ ran, skipped, total: files.length }, "db-ops: done");
	} finally {
		await releaseAdvisoryLock(db);
	}
}

export async function runMigrationsFromEnv(): Promise<void> {
	const { db } = await import("@harmonia/db");
	await runMigrations({ db, log: logger });
}
