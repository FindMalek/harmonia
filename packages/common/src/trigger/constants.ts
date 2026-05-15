/** Lyrics: 500 tracks/worker → ~3 min at pLimit(10). Queue cap guards LRCLib free API. */
export const LYRICS_FANOUT_CHUNK_SIZE = 500;
export const LYRICS_WORKER_QUEUE_CONCURRENCY = 4;

/** Classify: 60 tracks/worker → 5 LLM batches of 12, pLimit(2) → ~30s/worker. */
export const CLASSIFY_FANOUT_CHUNK_SIZE = 60;
export const CLASSIFY_WORKER_QUEUE_CONCURRENCY = 3;

/** Embed: 512 tracks/worker → 2 OpenAI batches of 256, pLimit(3) → ~4s/worker. */
export const EMBED_FANOUT_CHUNK_SIZE = 512;
export const EMBED_WORKER_QUEUE_CONCURRENCY = 5;
