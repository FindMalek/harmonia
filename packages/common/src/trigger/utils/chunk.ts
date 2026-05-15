import { createHash } from "node:crypto";

export function chunk<T>(arr: T[], size: number): T[][] {
	if (size <= 0) throw new Error(`chunk size must be > 0, got ${size}`);
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

/**
 * Derives a stable idempotency key from the actual track IDs in a worker chunk.
 * Using chunk index would cause stage retries to reuse stale cached results from
 * prior attempts (the DB re-query may produce different chunk boundaries after
 * partial progress), leaving tracks permanently unprocessed.
 */
export function workerIdempotencyKey(
	prefix: string,
	runId: number,
	trackIds: string[],
): string {
	const hash = createHash("sha256")
		.update([...trackIds].sort().join(","))
		.digest("hex")
		.slice(0, 16);
	return `${prefix}-${runId}-${hash}`;
}
