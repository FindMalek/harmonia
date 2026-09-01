import { listMigrationFiles, migrationNameFromFile } from "../migrations";
import type { RunOptions } from "../types";

export type ParsedMigrateArgs = RunOptions;

function argsAfterScript(argv: string[]): string[] {
	const args = argv.slice(2);
	const sep = args.indexOf("--");
	return sep >= 0 ? args.slice(sep + 1) : args;
}

export function parseMigrateArgs(argv: string[]): ParsedMigrateArgs {
	const args = argsAfterScript(argv);
	let dryRun = false;
	let only: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (arg === "--only") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				throw new Error("db-ops:migrate: --only requires a migration name");
			}
			only = value;
			i++;
			continue;
		}
		if (arg.startsWith("-")) {
			throw new Error(`db-ops:migrate: unknown flag ${arg}`);
		}
	}

	return { dryRun, only };
}

/** Match slug (backfill-cost-usd) or full name (20260828120000-backfill-cost-usd). */
export function resolveMigrationFileByOnly(
	only: string,
	files: string[] = listMigrationFiles(),
): string | null {
	const normalized = only.trim();

	const exact = files.find(
		(file) => migrationNameFromFile(file) === normalized,
	);
	if (exact) return exact;

	const suffixMatches = files.filter((file) =>
		file.endsWith(`-${normalized}.ts`),
	);
	if (suffixMatches.length > 1) {
		throw new Error(
			`db-ops:migrate: --only ${normalized} matches multiple migrations: ${suffixMatches.join(", ")} — use the full timestamped name`,
		);
	}
	return suffixMatches[0] ?? null;
}

export function filterFilesByOnly(
	files: string[],
	only: string | undefined,
): string[] {
	if (!only) return files;
	const match = resolveMigrationFileByOnly(only);
	if (!match) {
		throw new Error(`db-ops:migrate: no migration matches --only ${only}`);
	}
	return [match];
}

export function parseDatabaseHost(databaseUrl: string | undefined): string {
	if (!databaseUrl) return "(SONARAEM_DATABASE_URL not set)";
	try {
		return new URL(databaseUrl).host;
	} catch {
		return "(invalid SONARAEM_DATABASE_URL)";
	}
}
