import { describe, expect, it } from "vitest";

import { computeCostUsd } from "../pricing";

describe("computeCostUsd", () => {
	it("computes cost from the AI SDK usage shape (inputTokens/outputTokens)", () => {
		const cost = computeCostUsd("groq", "openai/gpt-oss-20b", {
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
		});
		expect(cost).toBeCloseTo(0.375, 6);
	});

	it("computes cost from the raw OpenAI REST usage shape (prompt_tokens, no output)", () => {
		const cost = computeCostUsd("openai", "text-embedding-3-small", {
			prompt_tokens: 500_000,
			total_tokens: 500_000,
		});
		// $0.02 per 1M input tokens, embeddings have no output tokens to bill
		expect(cost).toBeCloseTo(0.01, 6);
	});

	it("resolves legacy /v1/embeddings endpoint to text-embedding-3-small", () => {
		const cost = computeCostUsd("openai", "/v1/embeddings", {
			prompt_tokens: 1_000_000,
		});
		expect(cost).toBeCloseTo(0.02, 6);
	});

	it("returns null for a provider/model not in the pricing table", () => {
		expect(
			computeCostUsd("spotify", "/me/tracks", { inputTokens: 1000 }),
		).toBeNull();
	});

	it("returns null for missing usage", () => {
		expect(computeCostUsd("groq", "openai/gpt-oss-20b", undefined)).toBeNull();
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

	it("computes cost for Groq's gpt-oss-120b (cluster-metadata/playlist-naming's Groq entry)", () => {
		const cost = computeCostUsd("groq", "openai/gpt-oss-120b", {
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
		});
		expect(cost).toBeCloseTo(0.75, 6);
	});

	it("computes zero (not null) for Concentrate's free gpt-oss tier with real usage", () => {
		const cost = computeCostUsd("concentrate", "gpt-oss-20b", {
			inputTokens: 500_000,
			outputTokens: 500_000,
		});
		expect(cost).toBe(0);
	});

	it("computes cost for Claude Sonnet 5 via Concentrate (playlist-naming's assigned model)", () => {
		const cost = computeCostUsd("concentrate", "claude-sonnet-5", {
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
		});
		// $2.00 input + $10.00 output per 1M tokens
		expect(cost).toBeCloseTo(12.0, 6);
	});
});
