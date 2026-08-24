import {
	adminCostsListInput,
	adminCostsListOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { externalApiCall } from "@harmonia/db/schema/external-api-call";
import { pipelineRun } from "@harmonia/db/schema/pipeline-run";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { adminProcedure } from "../../procedures";

export const adminCostsRouter = {
	list: adminProcedure
		.input(adminCostsListInput)
		.output(adminCostsListOutputSchema)
		.handler(async ({ input }) => {
			const { page, pageSize, q, provider } = input;
			const offset = (page - 1) * pageSize;

			const searchCondition = q
				? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`))
				: undefined;

			// Runs that had at least one call from the filtered provider —
			// resolved separately rather than a correlated subquery, simpler
			// to read and this table is small enough it doesn't matter.
			let providerRunIds: number[] | null = null;
			if (provider) {
				const rows = await db
					.selectDistinct({ pipelineRunId: externalApiCall.pipelineRunId })
					.from(externalApiCall)
					.where(eq(externalApiCall.provider, provider));
				providerRunIds = rows
					.map((r) => r.pipelineRunId)
					.filter((id): id is number => id !== null);
			}

			const where = and(
				searchCondition,
				providerRunIds ? inArray(pipelineRun.id, providerRunIds) : undefined,
			);

			const [runs, totalRows] = await Promise.all([
				db
					.select({
						runId: pipelineRun.id,
						userId: pipelineRun.userId,
						userEmail: user.email,
						userName: user.name,
						triggeredBy: pipelineRun.triggeredBy,
						status: pipelineRun.status,
						startedAt: pipelineRun.startedAt,
						completedAt: pipelineRun.completedAt,
					})
					.from(pipelineRun)
					.innerJoin(user, eq(user.id, pipelineRun.userId))
					.where(where)
					.orderBy(desc(pipelineRun.startedAt))
					.limit(pageSize)
					.offset(offset),
				db
					.select({ total: count() })
					.from(pipelineRun)
					.innerJoin(user, eq(user.id, pipelineRun.userId))
					.where(where),
			]);

			const runIds = runs.map((r) => r.runId);
			const costRows =
				runIds.length > 0
					? await db
							.select({
								pipelineRunId: externalApiCall.pipelineRunId,
								provider: externalApiCall.provider,
								costUsd: sql<string>`coalesce(sum(${externalApiCall.costUsd}), 0)`,
							})
							.from(externalApiCall)
							.where(inArray(externalApiCall.pipelineRunId, runIds))
							.groupBy(externalApiCall.pipelineRunId, externalApiCall.provider)
					: [];

			const costByRun = new Map<number, { groq: number; openai: number }>();
			for (const row of costRows) {
				if (row.pipelineRunId === null) continue;
				const entry = costByRun.get(row.pipelineRunId) ?? {
					groq: 0,
					openai: 0,
				};
				const value = Number(row.costUsd);
				if (row.provider === "groq") entry.groq += value;
				if (row.provider === "openai") entry.openai += value;
				costByRun.set(row.pipelineRunId, entry);
			}

			const total = totalRows[0]?.total ?? 0;

			return {
				items: runs.map((r) => {
					const cost = costByRun.get(r.runId) ?? { groq: 0, openai: 0 };
					return {
						...r,
						groqCostUsd: cost.groq,
						openaiCostUsd: cost.openai,
						totalCostUsd: cost.groq + cost.openai,
					};
				}),
				total,
				page,
				pageSize,
				pageCount: Math.ceil(total / pageSize),
			};
		}),
};
