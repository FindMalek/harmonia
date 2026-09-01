import crypto from "node:crypto";
import fs from "node:fs";

import { dbEnv } from "@sonaraem/env/presets/db";
import { logger } from "@sonaraem/logger";

import {
	acquireAdvisoryLock,
	ensureOpsTable,
	getLedgerRow,
	getLedgerRowSafe,
	markCompleted,
	markFailed,
	markRunning,
	releaseAdvisoryLock,
	resolveMigrationAction,
} from "./ledger";
import { createSessionDb } from "./lib/create-session-db";
import {
	filterFilesByOnly,
	parseDatabaseHost,
	resolveMigrationFileByOnly,
} from "./lib/parse-migrate-args";
import { shouldRunMigration } from "./lib/should-run-migration";
import {
	listMigrationFiles,
	migrationFilePath,
	migrationImportUrl,
	migrationNameFromFile,
} from "./migrations";
import type { DbOpsContext, MigrationModule, RunOptions } from "./types";

function fileChecksum(filePath: string): string {
	const contents = fs.readFileSync(filePath, "utf-8");
	return crypto.createHash("sha256").update(contents).digest("hex");
}

function printDryRunBanner(
	options: RunOptions,
	databaseUrl: string | undefined,
): void {
	const host = parseDatabaseHost(databaseUrl);
	console.info("DRY RUN — no writes, no ledger updates");
	console.info(`Database: ${host}`);
	if (options.only) {
		console.info(`Migration: ${options.only}`);
	}
	console.info("");
}

export async function runMigrations(
	ctx: DbOpsContext,
	options: RunOptions = {},
): Promise<void> {
	const { db, log } = ctx;
	const dryRun = options.dryRun === true;

	if (dryRun && process.env.CI === "true") {
		throw new Error("db-ops:migrate: --dry-run is not allowed in CI");
	}

	if (dryRun) {
		printDryRunBanner(options, dbEnv.SONARAEM_DATABASE_URL);
	} else {
		await ensureOpsTable(db);
		await acquireAdvisoryLock(db);
	}

	let ran = 0;
	let skipped = 0;

	try {
		let files = listMigrationFiles();
		files = filterFilesByOnly(files, options.only);
		const now = new Date();
		const onlyFile = options.only
			? resolveMigrationFileByOnly(options.only)
			: null;

		for (const file of files) {
			const name = migrationNameFromFile(file);
			const filePath = migrationFilePath(file);
			const checksum = fileChecksum(filePath);
			const row = dryRun
				? await getLedgerRowSafe(db, name)
				: await getLedgerRow(db, name);
			const action = resolveMigrationAction(row, checksum, now);
			const isOnlyTarget = onlyFile === file;

			if (action === "checksum_mismatch") {
				throw new Error(
					`db-ops: checksum mismatch for completed migration "${name}" — add a new migration instead of editing a shipped one`,
				);
			}

			if (action === "abort_in_progress" && !(dryRun && isOnlyTarget)) {
				throw new Error(
					`db-ops: migration "${name}" is still running — wait or mark stale runs failed before retrying`,
				);
			}

			if (!shouldRunMigration(action, { dryRun, isOnlyTarget })) {
				skipped++;
				log.info({ name }, "db-ops: skip completed migration");
				continue;
			}

			log.info(
				{
					name,
					dryRun,
					attempt: dryRun ? undefined : (row?.attempts ?? 0) + 1,
				},
				dryRun ? "db-ops: dry-run" : "db-ops: running",
			);

			if (!dryRun) {
				await markRunning(db, name, checksum);
			}

			try {
				const mod = (await import(migrationImportUrl(file))) as MigrationModule;
				if (typeof mod.up !== "function") {
					throw new Error(`db-ops: migration "${name}" must export up()`);
				}
				await mod.up({ db, log, dryRun });
				if (!dryRun) {
					await markCompleted(db, name);
				}
				ran++;
				log.info(
					{ name, dryRun },
					dryRun ? "db-ops: dry-run completed" : "db-ops: completed",
				);
			} catch (err) {
				if (!dryRun) {
					const message = err instanceof Error ? err.message : String(err);
					await markFailed(db, name, message);
				}
				log.error({ err, name, dryRun }, "db-ops: failed");
				throw err;
			}
		}

		log.info({ ran, skipped, total: files.length, dryRun }, "db-ops: done");
	} finally {
		if (!dryRun) {
			await releaseAdvisoryLock(db);
		}
	}
}

export async function runMigrationsFromEnv(
	options: RunOptions = {},
): Promise<void> {
	const session = await createSessionDb();
	try {
		await runMigrations(
			{ db: session.db, log: logger, dryRun: options.dryRun === true },
			options,
		);
	} finally {
		await session.release();
	}
}
