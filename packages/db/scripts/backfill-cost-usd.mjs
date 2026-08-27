import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

// One-off backfill for external_api_call rows logged before the cost_usd column existed.
// Only groq/openai/gpt-oss-20b (classification) rows have usage data in response_payload —
// every other provider/endpoint predating this feature has no usage to recover from.
// Rate mirrors packages/common/src/constants/pricing.ts as of 2026-08-27; re-check that
// table if this is ever run again after a pricing change.
const RATE = { input: 0.1, output: 0.5 }; // $ per 1M tokens

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPackageRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(dbPackageRoot, "../../.env") });

const url = process.env.HARMONIA_DATABASE_URL?.trim();
if (!url) {
	console.error("backfill-cost-usd: HARMONIA_DATABASE_URL is not set");
	process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const { rows } = await client.query(
	`SELECT id, response_payload FROM external_api_call
	 WHERE provider = 'groq' AND endpoint = 'openai/gpt-oss-20b'
	 AND cost_usd IS NULL AND response_payload IS NOT NULL`,
);

let updated = 0;
for (const row of rows) {
	const usage = row.response_payload?.usage;
	const inputTokens = usage?.inputTokens ?? usage?.prompt_tokens ?? 0;
	const outputTokens = usage?.outputTokens ?? 0;
	if (inputTokens === 0 && outputTokens === 0) continue;

	const costUsd =
		(inputTokens / 1_000_000) * RATE.input +
		(outputTokens / 1_000_000) * RATE.output;

	await client.query(
		"UPDATE external_api_call SET cost_usd = $1 WHERE id = $2",
		[costUsd, row.id],
	);
	updated++;
}

console.log(
	`backfill-cost-usd: examined ${rows.length} rows, updated ${updated}`,
);
await client.end();
