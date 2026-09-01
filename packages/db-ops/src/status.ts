import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { db } = await import("@sonaraem/db");
const { ensureOpsTable, getLedgerRow, listLedgerRows, resolveMigrationAction } =
	await import("./ledger");
const { listMigrationFiles, migrationFilePath, migrationNameFromFile } =
	await import("./migrations");

await ensureOpsTable(db);
const files = listMigrationFiles();
const ledger = await listLedgerRows(db);
const ledgerByName = new Map(ledger.map((row) => [row.name, row]));

console.info("db-ops status:\n");

for (const file of files) {
	const name = migrationNameFromFile(file);
	const filePath = migrationFilePath(file);
	const checksum = crypto
		.createHash("sha256")
		.update(fs.readFileSync(filePath, "utf-8"))
		.digest("hex");
	const row = ledgerByName.get(name) ?? (await getLedgerRow(db, name));
	const action = resolveMigrationAction(row, checksum, new Date());
	const status = row?.status ?? "pending";
	console.info(`  ${name}: ${status} (${action})`);
}

const orphanRows = ledger.filter(
	(row) => !files.some((file) => migrationNameFromFile(file) === row.name),
);
for (const row of orphanRows) {
	console.info(`  ${row.name}: ${row.status} (orphan — file missing)`);
}

if (files.length === 0) {
	console.info("  (no migration files)");
}
