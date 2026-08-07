/** Lyrics: 500 tracks/worker, pLimit(3), 2 concurrent workers → 6 peak LRCLib requests. */
export const LYRICS_FANOUT_CHUNK_SIZE = 500;
export const LYRICS_WORKER_QUEUE_CONCURRENCY = 2;

/** Audio features: 500 tracks/worker, pLimit(3), 2 concurrent workers → 6 peak GetSongBPM requests. */
export const AUDIO_FEATURES_FANOUT_CHUNK_SIZE = 500;
export const AUDIO_FEATURES_WORKER_QUEUE_CONCURRENCY = 2;

/**
 * Classify: 200 tracks/worker → ~34 LLM batches of 6.
 * Peak Groq calls ≈ CLASSIFY_WORKER_QUEUE_CONCURRENCY × CLASSIFICATION_CONCURRENCY
 * (see packages/common/src/constants/brain.ts).
 */
export const CLASSIFY_FANOUT_CHUNK_SIZE = 200;
/** Simultaneous classify workers (Trigger queue in stages/classify.ts). */
export const CLASSIFY_WORKER_QUEUE_CONCURRENCY = 2;

/** Embed: 512 tracks/worker → 2 OpenAI batches of 256, pLimit(3) → ~4s/worker. */
export const EMBED_FANOUT_CHUNK_SIZE = 512;
export const EMBED_WORKER_QUEUE_CONCURRENCY = 5;
