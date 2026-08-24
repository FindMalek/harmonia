import { describe, expect, it } from "vitest";

import { computeCostUsd } from "../pricing";

describe("computeCostUsd", () => {
	it("computes cost from the AI SDK usage shape (inputTokens/outputTokens)", () => {
		const cost = computeCostUsd("groq", "openai/gpt-oss-20b", {
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
		});
		// $0.10 input + $0.50 output per 1M tokens
		expect(cost).toBeCloseTo(0.6, 6);
	});

	it("computes cost from the raw OpenAI REST usage shape (prompt_tokens, no output)", () => {
		const cost = computeCostUsd("openai", "text-embedding-3-small", {
			prompt_tokens: 500_000,
			total_tokens: 500_000,
		});
		// $0.02 per 1M input tokens, embeddings have no output tokens to bill
		expect(cost).toBeCloseTo(0.01, 6);
	});

	it("returns null for a provider/model not in the pricing table", () => {
		expect(
			computeCostUsd("spotify", "/me/tracks", { inputTokens: 1000 }),
		).toBeNull();
	});

	it("returns null for missing usage", () => {
		expect(
			computeCostUsd("groq", "openai/gpt-oss-20b", undefined),
		).toBeNull();
	});

	it("returns null for malformed usage", () => {
		expect(
			computeCostUsd("groq", "openai/gpt-oss-20b", "not an object"),
		).toBeNull();
	});

	it("returns null when usage tokens are both zero", () => {
		expect(
			computeCostUsd("groq", "openai/gpt-oss-20b", {
				inputTokens: 0,
				outputTokens: 0,
			}),
		).toBeNull();
	});
});
