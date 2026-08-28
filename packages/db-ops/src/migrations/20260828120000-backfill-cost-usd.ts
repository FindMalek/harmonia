import { computeCostUsd } from "@harmonia/common/constants";
import { externalApiCall } from "@harmonia/db/schema/external-api-call";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";

import type { DbOpsContext } from "../types";

export async function up({ db, log }: DbOpsContext): Promise<void> {
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

	let updated = 0;
	let skipped = 0;

	for (const row of rows) {
		const usage = (row.responsePayload as { usage?: unknown } | null)?.usage;
		const costUsd = computeCostUsd(row.provider, row.endpoint, usage);
		if (costUsd === null) {
			skipped++;
			continue;
		}
		if (
			row.provider !== "groq" &&
			row.costUsd !== null &&
			Math.abs(row.costUsd - costUsd) < 1e-9
		) {
			skipped++;
			continue;
		}

		await db
			.update(externalApiCall)
			.set({ costUsd })
			.where(eq(externalApiCall.id, row.id));
		updated++;
	}

	log.info(
		{ examined: rows.length, updated, skipped },
		"backfill-cost-usd done",
	);
}
