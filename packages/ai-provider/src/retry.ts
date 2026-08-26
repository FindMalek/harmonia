import { logger } from "@harmonia/logger";
import { APICallError, NoObjectGeneratedError } from "ai";
import pRetry, { AbortError } from "p-retry";

const DEFAULT_RATE_LIMIT_FALLBACK_DELAY_MS = 45_000;
// retry-after is provider-controlled and otherwise unbounded.
const MAX_RATE_LIMIT_DELAY_MS = 120_000;

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
		if (Number.isFinite(seconds) && seconds > 0) {
			return Math.min(seconds * 1000, MAX_RATE_LIMIT_DELAY_MS);
		}
	}
	return fallbackMs;
}

// Tuned against Groq's error text — revisit once Concentrate/Gemini are live.
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
		message.includes("does not match the expected schema")
	);
}

export function logInvalidJsonError(err: unknown): void {
	if (!NoObjectGeneratedError.isInstance(err)) return;
	const { text, cause } = err;
	let failedText = text;
	if (
		failedText === undefined &&
		typeof cause === "object" &&
		cause !== null &&
		"failed_generation" in cause
	) {
		failedText = String(cause.failed_generation);
	}
	logger.warn(
		{ errorMessage: err.message, rawOutput: failedText, cause },
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
	label: string;
};

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
					// Last attempt — p-retry won't call fn again, so don't wait.
					if (attemptCount > options.retries) throw err;
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
					throw new AbortError(err);
				}
				throw err;
			}
		},
		{
			retries: options.retries,
			minTimeout: options.minTimeout ?? 1000,
			randomize: options.randomize ?? true,
			onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
				logger.warn(
					{
						label: options.label,
						attempt: attemptNumber,
						retriesLeft,
						error: error.message,
					},
					"LLM call failed, retrying",
				);
			},
		},
	);
}
