// $ per 1M tokens by provider/model, sourced 2026-08-24/25 from each provider's own pricing page.
// ponytail: static table, no auto-refresh — revisit when a provider changes pricing.
export const PRICING_PER_1M_TOKENS: Record<
	string,
	Record<string, { input: number; output: number }>
> = {
	groq: {
		"openai/gpt-oss-20b": { input: 0.075, output: 0.3 },
		"openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
	},
	concentrate: {
		"gpt-oss-20b": { input: 0, output: 0 },
		"gpt-oss-120b": { input: 0, output: 0 },
		"claude-sonnet-5": { input: 2.0, output: 10.0 },
	},
	openai: {
		"text-embedding-3-small": { input: 0.02, output: 0 },
	},
};

// Tolerates both the AI SDK's { inputTokens, outputTokens } and the raw OpenAI REST API's { prompt_tokens }; returns null when usage is missing/malformed.
export function parseUsageTokens(
	usage: unknown,
): { inputTokens: number; outputTokens: number } | null {
	if (typeof usage !== "object" || usage === null) return null;
	const u = usage as Record<string, unknown>;
	const inputTokens =
		typeof u.inputTokens === "number"
			? u.inputTokens
			: typeof u.prompt_tokens === "number"
				? u.prompt_tokens
				: 0;
	const outputTokens = typeof u.outputTokens === "number" ? u.outputTokens : 0;
	if (inputTokens === 0 && outputTokens === 0) return null;
	return { inputTokens, outputTokens };
}

// Returns null when unpriced (e.g. Spotify, LRCLib) or usage is missing.
export function computeCostUsd(
	provider: string,
	endpoint: string,
	usage: unknown,
): number | null {
	const rates = PRICING_PER_1M_TOKENS[provider]?.[endpoint];
	const tokens = parseUsageTokens(usage);
	if (!rates || !tokens) return null;

	return (
		(tokens.inputTokens / 1_000_000) * rates.input +
		(tokens.outputTokens / 1_000_000) * rates.output
	);
}
