export function formatMigrationTimestamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		String(date.getUTCFullYear()) +
		pad(date.getUTCMonth() + 1) +
		pad(date.getUTCDate()) +
		pad(date.getUTCHours()) +
		pad(date.getUTCMinutes()) +
		pad(date.getUTCSeconds())
	);
}

export function buildMigrationFileContent(options: {
	slug: string;
	filename: string;
	createdAt: Date;
}): string {
	const { slug, filename, createdAt } = options;
	const iso = createdAt.toISOString();
	const migrationName = filename.replace(/\.ts$/, "");

	return `/**
 * db-ops migration: ${slug}
 * file: ${filename}
 * created: ${iso}
 *
 * WHAT
 *   TODO: describe the data change (backfill, fix, seed, etc.)
 *
 * PREREQUISITES
 *   - Any new columns/tables must exist via Drizzle first (@harmonia/db)
 *   - Local: pnpm db:push  (or pnpm db:migrate if testing SQL migration files)
 *
 * RUN (set HARMONIA_DATABASE_URL in .env to the database you want)
 *
 *   Test without writes:
 *     pnpm db:ops:migrate -- --dry-run --only ${slug}
 *
 *   Apply for real (local dev):
 *     pnpm db:ops:migrate -- --only ${slug}
 *
 *   Prod: merge PR — CI runs pnpm db:ops:migrate (no --dry-run)
 *
 * OTHER
 *   pnpm db:ops:status
 *   pnpm db:reset   (truncates harmonia_db_ops locally)
 *
 * AUTHOR RULES
 *   - Handle dryRun in up() — reads OK, no writes when dryRun is true
 *   - Idempotent: safe if retried after a crash before the ledger marks completed
 *   - No DDL here — CREATE/ALTER/DROP belongs in Drizzle schema migrations
 *   - Never edit this file after it is completed in prod — checksum mismatch fails CI
 *
 * ESCAPE HATCH (prod, rare)
 *   UPDATE harmonia_db_ops SET status = 'failed' WHERE name = '${migrationName}';
 *   then re-run the Database migrations workflow
 */

import type { DbOpsContext } from "../types";

export async function up({ db, log, dryRun }: DbOpsContext): Promise<void> {
	log.info({ dryRun }, "${slug}: starting");

	// TODO: select rows, classify wouldUpdate vs skipped
	if (dryRun) {
		log.info({ examined: 0, wouldUpdate: 0, skipped: 0 }, "${slug}: dry-run done");
		return;
	}

	// TODO: real writes — only when dryRun is false
	void db;

	log.info("${slug}: done");
}
`;
}
