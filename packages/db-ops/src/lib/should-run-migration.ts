import type { MigrationAction } from "../types";

/** Whether to invoke up() for this file given ledger action and CLI flags. */
export function shouldRunMigration(
	action: MigrationAction,
	options: { dryRun: boolean; isOnlyTarget: boolean },
): boolean {
	const { dryRun, isOnlyTarget } = options;

	if (dryRun && isOnlyTarget) {
		return true;
	}

	if (action === "skip") return false;
	if (action === "checksum_mismatch") return true;
	if (action === "abort_in_progress") return true;
	return action === "run";
}
