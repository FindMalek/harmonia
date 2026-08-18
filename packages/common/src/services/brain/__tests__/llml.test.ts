import { isSplitRetryableError } from "@harmonia/ai-provider";
import { AbortError } from "p-retry";
import { describe, expect, it } from "vitest";

describe("isSplitRetryableError", () => {
	it("recognizes Groq's schema-validation rejection (additionalProperties variant)", () => {
		const err = new Error(
			"Generated JSON does not match the expected schema. Please adjust your prompt. See 'failed_generation' for more details. Error: jsonschema: '' does not validate with /additionalProperties: additionalProperties '$schema', 'additionalProperties', 'properties', 'required', 'type' not allowed",
		);
		expect(isSplitRetryableError(err)).toBe(true);
	});

	it("recognizes Groq's schema-validation rejection (missing required property variant)", () => {
		const err = new Error(
			"Generated JSON does not match the expected schema. Please adjust your prompt. See 'failed_generation' for more details. Error: jsonschema: '' does not validate with /required: missing properties: 'results'",
		);
		expect(isSplitRetryableError(err)).toBe(true);
	});

	it("unwraps an AbortError to check its original error", () => {
		const original = new Error(
			"Generated JSON does not match the expected schema.",
		);
		const aborted = new AbortError(original);
		expect(isSplitRetryableError(aborted)).toBe(true);
	});

	it("still recognizes the pre-existing message patterns", () => {
		expect(isSplitRetryableError(new Error("Failed to validate JSON"))).toBe(
			true,
		);
		expect(isSplitRetryableError(new Error("No output generated"))).toBe(true);
	});

	it("does not treat an unrelated error as split-retryable", () => {
		expect(isSplitRetryableError(new Error("network timeout"))).toBe(false);
	});
});
