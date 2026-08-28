/**
 * db-ops migration: backfill-cost-usd
 * file: 20260828120000-backfill-cost-usd.ts
 *
 * WHAT
 *   Fill external_api_call.cost_usd from stored response_payload.usage via computeCostUsd.
 *   Also recomputes groq rows that were written at old list rates.
 *   Legacy openai rows logged with endpoint /v1/embeddings are priced via computeCostUsd normalization.
 *
 * PREREQUISITES
 *   - Drizzle migration 0035 (cost_usd column) must be applied first
 *
 * RUN (set HARMONIA_DATABASE_URL in .env to the database you want)
 *
 *   Test without writes:
 *     pnpm db:ops:migrate -- --dry-run --only backfill-cost-usd
 *
 *   Apply for real (local dev):
 *     pnpm db:ops:migrate -- --only backfill-cost-usd
 *
 *   Prod: merge PR — CI runs pnpm db:ops:migrate (no --dry-run)
 *
 * OTHER
 *   pnpm db:ops:status
 *   pnpm db:reset   (truncates harmonia_db_ops locally)
 */

import { computeCostUsd } from "@harmonia/common/constants";
import { externalApiCall } from "@harmonia/db/schema/external-api-call";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";

import type { DbOpsContext } from "../types";

type CostRow = {
	id: number;
	provider: string;
	endpoint: string;
	responsePayload: unknown;
	costUsd: number | null;
};

function classifyRow(row: CostRow): "update" | "skip" {
	const usage = (row.responsePayload as { usage?: unknown } | null)?.usage;
	const costUsd = computeCostUsd(row.provider, row.endpoint, usage);
	if (costUsd === null) return "skip";
	if (
		row.provider !== "groq" &&
		row.costUsd !== null &&
		Math.abs(row.costUsd - costUsd) < 1e-9
	) {
		return "skip";
	}
	return "update";
}

export async function up({ db, log, dryRun }: DbOpsContext): Promise<void> {
	log.info({ dryRun }, "backfill-cost-usd: starting");

	const rows = await db
		.select({
			id: externalApiCall.id,
			provider: externalApiCall.provider,
			endpoint: externalApiCall.endpoint,
			responsePayload: externalApiCall.responsePayload,
			costUsd: externalApiCall.costUsd,
		})
		.from(externalApiCall)
		.where(
			and(
				isNotNull(externalApiCall.responsePayload),
				or(
					isNull(externalApiCall.costUsd),
					eq(externalApiCall.provider, "groq"),
				),
			),
		);

	let wouldUpdate = 0;
	let skipped = 0;

	for (const row of rows) {
		if (classifyRow(row) === "skip") {
			skipped++;
			continue;
		}

		if (dryRun) {
			wouldUpdate++;
			continue;
		}

		const usage = (row.responsePayload as { usage?: unknown } | null)?.usage;
		const costUsd = computeCostUsd(row.provider, row.endpoint, usage);
		if (costUsd === null) continue;

		await db
			.update(externalApiCall)
			.set({ costUsd })
			.where(eq(externalApiCall.id, row.id));
		wouldUpdate++;
	}

	if (dryRun) {
		log.info(
			{ examined: rows.length, wouldUpdate, skipped },
			"backfill-cost-usd: dry-run done",
		);
		return;
	}

	log.info(
		{ examined: rows.length, updated: wouldUpdate, skipped },
		"backfill-cost-usd: done",
	);
}
