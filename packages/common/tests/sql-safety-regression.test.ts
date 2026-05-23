import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseJsonStringArray } from "../src/services/shared/parse-json-string-array.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("parseJsonStringArray returns [] for malformed or non-array payloads", () => {
	assert.deepEqual(parseJsonStringArray(undefined), []);
	assert.deepEqual(parseJsonStringArray(null), []);
	assert.deepEqual(parseJsonStringArray(""), []);
	assert.deepEqual(parseJsonStringArray("not json"), []);
	assert.deepEqual(parseJsonStringArray("{\"a\":1}"), []);
	assert.deepEqual(parseJsonStringArray("[1,true,{\"x\":1}]"), []);
});

test("parseJsonStringArray keeps only string items in valid arrays", () => {
	assert.deepEqual(parseJsonStringArray("[\"a\",\"b\"]"), ["a", "b"]);
	assert.deepEqual(parseJsonStringArray("[\"a\",1,\"b\",null]"), ["a", "b"]);
});

test("embeddings updates do not reference removed track.user_id column", async () => {
	const embeddingsPath = path.join(
		__dirname,
		"../src/services/brain/embeddings.ts",
	);
	const source = await readFile(embeddingsPath, "utf8");

	const stalePredicateMatches = source.match(/WHERE\s+user_id\s*=/g);
	assert.equal(
		stalePredicateMatches?.length ?? 0,
		0,
		"embeddings updates must not reference track.user_id",
	);

	const idempotentUpdateMatches = source.match(
		/WHERE\s+id\s*=\s*\$\{input\.id\}\s+AND\s+embedding\s+IS\s+NULL/g,
	);
	assert.equal(
		idempotentUpdateMatches?.length ?? 0,
		2,
		"both embedding update paths should guard with id + embedding IS NULL",
	);
});
