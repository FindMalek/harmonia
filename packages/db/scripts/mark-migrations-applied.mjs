#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
/**
 * Inserts all migrations from meta/_journal.json into drizzle.__drizzle_migrations
 * so that `pnpm db:migrate` skips them. Use when the DB already has the schema (e.g. from
 * a previous migration or db:push) and migrate fails with "relation already exists".
 *
 * Run from repo root: pnpm db:mark-migrations-applied
 * Or from packages/db: node scripts/mark-migrations-applied.mjs
 */
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env (packages/db/scripts -> ../../../.env)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error(
		"DATABASE_URL is not set. Ensure root .env exists with DATABASE_URL.",
	);
	process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(__dirname, "../src/migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta/_journal.json");

const sql = neon(DATABASE_URL);

async function main() {
	const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));
	let inserted = 0;

	for (const entry of journal.entries) {
		const migrationPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
		const query = fs.readFileSync(migrationPath, "utf-8");
		const hash = crypto.createHash("sha256").update(query).digest("hex");
		const created_at = entry.when;

		try {
			await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
				VALUES (${hash}, ${created_at})`;
			inserted++;
			console.log(`Marked ${entry.tag} as applied`);
		} catch (err) {
			if (err.code === "42P01") {
				console.error(
					"Table drizzle.__drizzle_migrations does not exist. Run pnpm db:migrate once (it will create the table and then fail); then run this script again.",
				);
				process.exit(1);
			}
			if (err.code === "23505") {
				console.log(`Skipped ${entry.tag} (already applied)`);
			} else {
				throw err;
			}
		}
	}

	console.log(
		`Done. Marked ${inserted} migration(s) as applied. Run pnpm db:migrate to verify.`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
