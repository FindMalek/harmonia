import { afterEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
	insertMock: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("@harmonia/db", () => ({
	db: { insert: dbMock.insertMock },
}));

import { logExternalApiCall } from "../external-api-log";

function insertedValues() {
	const valuesMock = dbMock.insertMock.mock.results[0]?.value.values;
	return valuesMock.mock.calls[0]?.[0];
}

describe("logExternalApiCall", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("derives success from a 2xx status", async () => {
		await logExternalApiCall({
			provider: "spotify",
			endpoint: "/me/tracks",
			httpStatus: 200,
		});
		expect(insertedValues()).toMatchObject({ statusCategory: "success" });
	});

	it("derives rate_limited from 429", async () => {
		await logExternalApiCall({
			provider: "spotify",
			endpoint: "/me/tracks",
			httpStatus: 429,
		});
		expect(insertedValues()).toMatchObject({ statusCategory: "rate_limited" });
	});

	it("derives not_found from 404", async () => {
		await logExternalApiCall({
			provider: "lrclib",
			endpoint: "/get",
			httpStatus: 404,
		});
		expect(insertedValues()).toMatchObject({ statusCategory: "not_found" });
	});

	it("derives client_error from other 4xx", async () => {
		await logExternalApiCall({
			provider: "groq",
			endpoint: "classify",
			httpStatus: 400,
		});
		expect(insertedValues()).toMatchObject({ statusCategory: "client_error" });
	});

	it("derives server_error from 5xx", async () => {
		await logExternalApiCall({
			provider: "openai",
			endpoint: "embeddings",
			httpStatus: 500,
		});
		expect(insertedValues()).toMatchObject({ statusCategory: "server_error" });
	});

	it("derives error when no status is present (e.g. network failure)", async () => {
		await logExternalApiCall({ provider: "spotify", endpoint: "/me/tracks" });
		expect(insertedValues()).toMatchObject({ statusCategory: "error" });
	});

	it("respects an explicit statusCategory override", async () => {
		await logExternalApiCall({
			provider: "spotify",
			endpoint: "/me/tracks",
			httpStatus: 200,
			statusCategory: "success",
		});
		expect(insertedValues()).toMatchObject({ statusCategory: "success" });
	});

	it("passes small payloads through untouched", async () => {
		await logExternalApiCall({
			provider: "spotify",
			endpoint: "/me/tracks",
			httpStatus: 200,
			requestPayload: { limit: 50 },
		});
		expect(insertedValues().requestPayload).toEqual({ limit: 50 });
	});

	it("truncates payloads larger than 10 KB", async () => {
		const bigPayload = { blob: "x".repeat(20_000) };
		await logExternalApiCall({
			provider: "spotify",
			endpoint: "/me/tracks",
			httpStatus: 200,
			responsePayload: bigPayload,
		});
		const { responsePayload } = insertedValues();
		expect(responsePayload._truncated).toBe(true);
		expect(typeof responsePayload._preview).toBe("string");
	});

	it("never throws when the db insert fails", async () => {
		dbMock.insertMock.mockImplementationOnce(() => ({
			values: vi.fn(() => Promise.reject(new Error("connection lost"))),
		}));
		await expect(
			logExternalApiCall({ provider: "spotify", endpoint: "/me/tracks" }),
		).resolves.toBeUndefined();
	});
});
