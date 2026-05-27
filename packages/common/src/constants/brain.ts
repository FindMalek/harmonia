export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_BATCH_SIZE = 256;
export const EMBEDDING_CONCURRENCY = 3;

export const CLASSIFICATION_LLM_MODEL =
	"meta-llama/llama-4-scout-17b-16e-instruct";
export const CLASSIFICATION_BATCH_SIZE = 6;
export const CLASSIFICATION_CONCURRENCY = 1;
export const CLASSIFICATION_MAX_OUTPUT_TOKENS = 8192;

/**
 * DBSCAN params tuned for semantic-only embeddings (v2: no Title/Artists/Album).
 * If clusters are still artist-dominated after migration, lower CLUSTER_EPSILON (try 0.4).
 * If clusters are too fragmented (many tiny groups), raise it (try 0.6–0.7).
 * Re-tune by running the cluster stage on a representative user and inspecting
 * artist distribution per cluster.
 */
export const CLUSTER_MIN_POINTS = 5;
export const CLUSTER_EPSILON = 0.5;
export const CLUSTER_MIN_SIZE = 20;
export const CLUSTER_MAX_SIZE = 80;

export const TRACK_MATCH_SIMILARITY_THRESHOLD = 0.7;

export const GROQ_RATE_LIMIT_FALLBACK_DELAY_MS = 45_000;
