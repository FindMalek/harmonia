#!/usr/bin/env node
/**
 * Inserts the initial migration (0000_cheerful_ironclad) into drizzle.__drizzle_migrations
 * so that `pnpm db:migrate` skips it. Use when the DB already has the schema (e.g. from
 * a previous migration or db:push) and migrate fails with "relation already exists".
 *
 * Run from repo root: pnpm db:mark-migrations-applied
 * Or from packages/db: node scripts/mark-migrations-applied.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

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

// Hash and created_at for 0000_cheerful_ironclad (from meta/_journal.json and SHA256 of migration SQL)
const MIGRATION_HASH =
	"feeb5aa7fe2b8b54cf0b5efc14331f56947cba1e8aeb2c84d8ed420105d02766";
const MIGRATION_CREATED_AT = 1772728003984;

const sql = neon(DATABASE_URL);

async function main() {
	try {
		await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${MIGRATION_HASH}, ${MIGRATION_CREATED_AT})`;
		console.log(
			"Marked migration 0000_cheerful_ironclad as applied. You can run pnpm db:migrate now.",
		);
	} catch (err) {
		if (err.code === "42P01") {
			console.error(
				"Table drizzle.__drizzle_migrations does not exist. Run pnpm db:migrate once (it will create the table and then fail); then run this script again.",
			);
		} else if (err.code === "23505") {
			console.log(
				"Migration was already marked as applied. pnpm db:migrate should be a no-op.",
			);
		} else {
			console.error(err);
			process.exit(1);
		}
	}
}

main();
