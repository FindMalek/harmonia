/**
 * $ per 1M tokens, by provider and model/endpoint. Sourced 2026-08-24:
 * - OpenAI text-embedding-3-small: confirmed directly from OpenAI's published pricing.
 * - Groq openai/gpt-oss-20b: Groq's own pricing page is JS-rendered and
 *   couldn't be fetched directly — this is the commonly-cited list price
 *   from third-party aggregators. Treat as approximate; verify against
 *   console.groq.com directly if precise billing reconciliation is needed.
 *
 * ponytail: static table, no auto-refresh — revisit when a provider changes pricing.
 */
export const PRICING_PER_1M_TOKENS: Record<
	string,
	Record<string, { input: number; output: number }>
> = {
	groq: {
		"openai/gpt-oss-20b": { input: 0.1, output: 0.5 },
	},
	openai: {
		"text-embedding-3-small": { input: 0.02, output: 0 },
	},
};

/**
 * Computes a $ cost from a logged usage object, tolerating both shapes this
 * codebase actually produces: the Vercel AI SDK's `{ inputTokens,
 * outputTokens }` (Groq classification calls) and the raw OpenAI REST API's
 * `{ prompt_tokens, total_tokens }` (embeddings, no separate output count —
 * embeddings have no output tokens to bill for).
 *
 * Returns null when the provider/model isn't in the pricing table (e.g.
 * Spotify, LRCLib — not token-billed) or usage is missing/malformed.
 */
export function computeCostUsd(
	provider: string,
	endpoint: string,
	usage: unknown,
): number | null {
	const rates = PRICING_PER_1M_TOKENS[provider]?.[endpoint];
	if (!rates || typeof usage !== "object" || usage === null) return null;

	const u = usage as Record<string, unknown>;
	const inputTokens =
		typeof u.inputTokens === "number"
			? u.inputTokens
			: typeof u.prompt_tokens === "number"
				? u.prompt_tokens
				: 0;
	const outputTokens = typeof u.outputTokens === "number" ? u.outputTokens : 0;

	if (inputTokens === 0 && outputTokens === 0) return null;

	return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}
