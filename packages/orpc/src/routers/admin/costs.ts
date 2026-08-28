import { parseUsageTokens } from "@harmonia/common/constants";
import {
	type AdminCostsCall,
	adminCostsDetailInput,
	adminCostsDetailOutputSchema,
	adminCostsListInput,
	adminCostsListOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { externalApiCall } from "@harmonia/db/schema/external-api-call";
import {
	pipelineRun,
	pipelineStageTiming,
} from "@harmonia/db/schema/pipeline-run";
import { ORPCError } from "@orpc/server";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	or,
	sql,
} from "drizzle-orm";

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

			// Runs with at least one call from the filtered provider — resolved separately rather than a correlated subquery; this table is small enough it doesn't matter.
			let providerRunIds: number[] | null = null;
			if (provider) {
				const rows = await db
					.selectDistinct({ pipelineRunId: externalApiCall.pipelineRunId })
					.from(externalApiCall)
					.where(eq(externalApiCall.provider, provider));
				providerRunIds = rows
					.map((r) => r.pipelineRunId)
					.filter((id): id is number => id !== null);

				if (providerRunIds.length === 0) {
					return {
						items: [],
						total: 0,
						page,
						pageSize,
						pageCount: 0,
					};
				}
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
							.where(
								and(
									inArray(externalApiCall.pipelineRunId, runIds),
									provider ? eq(externalApiCall.provider, provider) : undefined,
								),
							)
							.groupBy(externalApiCall.pipelineRunId, externalApiCall.provider)
					: [];

			const costByRun = new Map<
				number,
				{ groq: number; openai: number; concentrate: number }
			>();
			for (const row of costRows) {
				if (row.pipelineRunId === null) continue;
				const entry = costByRun.get(row.pipelineRunId) ?? {
					groq: 0,
					openai: 0,
					concentrate: 0,
				};
				const value = Number(row.costUsd);
				if (row.provider === "groq") entry.groq += value;
				if (row.provider === "openai") entry.openai += value;
				if (row.provider === "concentrate") entry.concentrate += value;
				costByRun.set(row.pipelineRunId, entry);
			}

			const total = totalRows[0]?.total ?? 0;

			return {
				items: runs.map((r) => {
					const cost = costByRun.get(r.runId) ?? {
						groq: 0,
						openai: 0,
						concentrate: 0,
					};
					return {
						...r,
						groqCostUsd: cost.groq,
						openaiCostUsd: cost.openai,
						concentrateCostUsd: cost.concentrate,
						totalCostUsd: provider
							? provider === "groq"
								? cost.groq
								: provider === "openai"
									? cost.openai
									: cost.concentrate
							: cost.groq + cost.openai + cost.concentrate,
					};
				}),
				total,
				page,
				pageSize,
				pageCount: Math.ceil(total / pageSize),
			};
		}),

	detail: adminProcedure
		.input(adminCostsDetailInput)
		.output(adminCostsDetailOutputSchema)
		.handler(async ({ input }) => {
			const { runId } = input;

			const [run] = await db
				.select({
					runId: pipelineRun.id,
					userEmail: user.email,
					userName: user.name,
					status: pipelineRun.status,
					triggeredBy: pipelineRun.triggeredBy,
					startedAt: pipelineRun.startedAt,
					completedAt: pipelineRun.completedAt,
					error: pipelineRun.error,
				})
				.from(pipelineRun)
				.innerJoin(user, eq(user.id, pipelineRun.userId))
				.where(eq(pipelineRun.id, runId));

			if (!run) throw new ORPCError("NOT_FOUND", { message: "Run not found" });

			const [stageTimings, callRows] = await Promise.all([
				db
					.select()
					.from(pipelineStageTiming)
					.where(eq(pipelineStageTiming.runId, runId))
					.orderBy(asc(pipelineStageTiming.startedAt)),
				db
					.select()
					.from(externalApiCall)
					.where(eq(externalApiCall.pipelineRunId, runId))
					.orderBy(asc(externalApiCall.createdAt)),
			]);

			const calls: AdminCostsCall[] = callRows.map((c) => {
				const tokens = parseUsageTokens(
					(c.responsePayload as { usage?: unknown } | null)?.usage,
				);
				return {
					id: c.id,
					provider: c.provider,
					endpoint: c.endpoint,
					method: c.method,
					httpStatus: c.httpStatus,
					statusCategory: c.statusCategory,
					durationMs: c.durationMs,
					retryAttempt: c.retryAttempt,
					costUsd: c.costUsd,
					inputTokens: tokens?.inputTokens ?? null,
					outputTokens: tokens?.outputTokens ?? null,
					errorMessage: c.errorMessage,
					createdAt: c.createdAt,
				};
			});

			// Bucket each call into the stage whose [startedAt, completedAt] window contains it — external_api_call has no stage column of its own, but stage timing windows don't overlap.
			const stages = stageTimings.map((s) => ({
				stage: s.stage,
				startedAt: s.startedAt,
				completedAt: s.completedAt,
				trackCount: s.trackCount,
				calls: [] as AdminCostsCall[],
			}));
			const ungroupedCalls: AdminCostsCall[] = [];
			for (const call of calls) {
				const stage = stages.find(
					(s) =>
						call.createdAt >= s.startedAt && call.createdAt <= s.completedAt,
				);
				if (stage) stage.calls.push(call);
				else ungroupedCalls.push(call);
			}

			const totalCostUsd = calls.reduce((sum, c) => sum + (c.costUsd ?? 0), 0);

			return { ...run, totalCostUsd, stages, ungroupedCalls };
		}),
};
