import { logger } from "@harmonia/logger";
import { APICallError, NoObjectGeneratedError } from "ai";
import pRetry, { AbortError } from "p-retry";

const DEFAULT_RATE_LIMIT_FALLBACK_DELAY_MS = 45_000;

export function isRateLimit(err: unknown): err is APICallError {
	return APICallError.isInstance(err) && err.statusCode === 429;
}

export function getRateLimitDelayMs(
	err: APICallError,
	fallbackMs: number = DEFAULT_RATE_LIMIT_FALLBACK_DELAY_MS,
): number {
	const retryAfter = err.responseHeaders?.["retry-after"];
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
	}
	return fallbackMs;
}

/**
 * True for errors worth retrying by splitting a batch in half rather than
 * simply retrying the same request — a structured-output/schema failure a
 * smaller batch might sidestep. Message substrings below are tuned against
 * Groq's error text (moved here unchanged from llml.ts); revisit once
 * Concentrate/Gemini are live and their error shapes are known.
 */
export function isSplitRetryableError(err: unknown): boolean {
	const cause =
		err instanceof AbortError && err.originalError != null
			? err.originalError
			: err;

	if (NoObjectGeneratedError.isInstance(cause)) return true;
	const message = cause instanceof Error ? cause.message : String(cause);
	return (
		message.includes("Failed to validate JSON") ||
		message.includes("No output generated") ||
		// Groq's structured-output rejection surfaces as a 4xx APICallError,
		// not NoObjectGeneratedError — e.g. "Generated JSON does not match
		// the expected schema... jsonschema: '' does not validate with ...".
		message.includes("does not match the expected schema")
	);
}

export function logInvalidJsonError(err: unknown): void {
	if (!NoObjectGeneratedError.isInstance(err)) return;
	const e = err as { text?: string; cause?: unknown };
	const failedText =
		e.text ??
		(typeof e.cause === "object" &&
		e.cause !== null &&
		"failed_generation" in e.cause
			? String((e.cause as { failed_generation?: string }).failed_generation)
			: undefined);
	logger.warn(
		{
			errorMessage: err.message,
			rawOutput: failedText,
			cause: e.cause,
		},
		"LLM returned invalid JSON; see rawOutput for model output",
	);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export type WithLLMRetryOptions = {
	retries: number;
	minTimeout?: number;
	randomize?: boolean;
	rateLimitFallbackDelayMs?: number;
	/** Included in retry/rate-limit log lines, e.g. "classification". */
	label: string;
};

/**
 * Wraps an LLM call with the retry/backoff behavior shared across all three
 * call sites: a 429 sleeps for the server's retry-after (or a fallback
 * delay) then retries, a hard non-429 4xx aborts immediately instead of
 * wasting retries, and every other failure follows p-retry's normal
 * backoff. Extracted from llml.ts's classifyTracksAdaptive, the most
 * complete of the three implementations that existed before this package.
 */
export async function withLLMRetry<T>(
	fn: (attemptCount: number) => Promise<T>,
	options: WithLLMRetryOptions,
): Promise<T> {
	return pRetry(
		async (attemptCount) => {
			try {
				return await fn(attemptCount);
			} catch (err) {
				if (isRateLimit(err)) {
					const delayMs = getRateLimitDelayMs(
						err,
						options.rateLimitFallbackDelayMs,
					);
					logger.warn(
						{
							label: options.label,
							delayMs,
							retryAfterHeader: err.responseHeaders?.["retry-after"],
						},
						"LLM call rate limited (429); sleeping before retry",
					);
					await sleep(delayMs);
					throw err;
				}
				if (
					APICallError.isInstance(err) &&
					err.statusCode !== undefined &&
					err.statusCode >= 400 &&
					err.statusCode < 500
				) {
					throw new AbortError(
						err instanceof Error ? err.message : String(err),
					);
				}
				throw err;
			}
		},
		{
			retries: options.retries,
			minTimeout: options.minTimeout ?? 1000,
			randomize: options.randomize ?? true,
			onFailedAttempt: (error) => {
				logger.warn(
					{
						label: options.label,
						attempt: error.attemptNumber,
						retriesLeft: error.retriesLeft,
						error: String(error),
					},
					"LLM call failed, retrying",
				);
			},
		},
	);
}
