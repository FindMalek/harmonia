import type { AIProviderName } from "@sonaraem/ai-provider";
import { db } from "@sonaraem/db";
import { externalApiCall } from "@sonaraem/db/schema/external-api-call";
import { logger } from "@sonaraem/logger";

const PAYLOAD_TRUNCATE_BYTES = 10_000;

function truncatePayload(
	payload: unknown,
): Record<string, unknown> | undefined {
	if (payload == null) return undefined;
	const str = JSON.stringify(payload);
	if (str.length <= PAYLOAD_TRUNCATE_BYTES)
		return payload as Record<string, unknown>;
	return { _truncated: true, _preview: str.slice(0, PAYLOAD_TRUNCATE_BYTES) };
}

function deriveStatusCategory(httpStatus: number | undefined | null): string {
	if (!httpStatus) return "error";
	if (httpStatus >= 200 && httpStatus < 300) return "success";
	if (httpStatus === 404) return "not_found";
	if (httpStatus === 429) return "rate_limited";
	if (httpStatus >= 400 && httpStatus < 500) return "client_error";
	return "server_error";
}

export type LogExternalApiCallInput = {
	userId?: string | null;
	pipelineRunId?: number | null;
	provider: "spotify" | "lrclib" | "openai" | AIProviderName;
	endpoint: string;
	method?: string;
	httpStatus?: number | null;
	requestPayload?: unknown;
	responsePayload?: unknown;
	durationMs?: number | null;
	errorMessage?: string | null;
	retryAttempt?: number;
	statusCategory?: string;
};

// Fire-and-forget — never throws; a logging failure must not fail the main request.
export async function logExternalApiCall(
	input: LogExternalApiCallInput,
): Promise<void> {
	try {
		const statusCategory =
			input.statusCategory ?? deriveStatusCategory(input.httpStatus);

		await db.insert(externalApiCall).values({
			userId: input.userId ?? null,
			pipelineRunId: input.pipelineRunId ?? null,
			provider: input.provider,
			endpoint: input.endpoint,
			method: input.method ?? "GET",
			httpStatus: input.httpStatus ?? null,
			requestPayload: truncatePayload(input.requestPayload),
			responsePayload: truncatePayload(input.responsePayload),
			durationMs: input.durationMs ?? null,
			errorMessage: input.errorMessage ?? null,
			statusCategory,
			retryAttempt: input.retryAttempt ?? 0,
		});
	} catch (err) {
		logger.error({ err }, "Failed to write external_api_call log row");
	}
}
