export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_BATCH_SIZE = 256;
export const EMBEDDING_CONCURRENCY = 3;

export const CLASSIFICATION_LLM_MODEL = "llama-3.3-70b-versatile";
export const CLASSIFICATION_BATCH_SIZE = 6;
export const CLASSIFICATION_CONCURRENCY = 1;
export const CLASSIFICATION_MAX_OUTPUT_TOKENS = 8192;

/**
 * DBSCAN params for semantic-only embeddings (v2: no Title/Artists/Album).
 *
 * Embeddings are L2-normalised in-memory before clustering (see
 * `services/brain/clustering.ts`), so DBSCAN's Euclidean distance is
 * equivalent to cosine distance (for unit vectors, ‖a−b‖² = 2 − 2·cos(θ)).
 * Cosine is the metric `text-embedding-3-small` is designed for and what the
 * `vector_cosine_ops` HNSW index on `track.embedding` already assumes.
 *
 * Epsilon is therefore in normalised-Euclidean units:
 *   eps ≈ 0.30  →  cos(θ) > ~0.95  (strictly similar tracks)
 *   eps ≈ 0.50  →  cos(θ) > ~0.87
 *   eps ≈ 0.75  →  cos(θ) > ~0.72
 *
 * Tuning: if clusters collapse into a few mega-clusters, LOWER epsilon
 * (try 0.20–0.25). If clusters are too fragmented / mostly noise, RAISE it
 * (try 0.35–0.45). The post-clustering sanity log (clusters/tracks ratio)
 * makes regressions visible — re-tune against a representative library.
 */
export const CLUSTER_MIN_POINTS = 5;
export const CLUSTER_EPSILON = 0.3;
export const CLUSTER_MIN_SIZE = 20;
export const CLUSTER_MAX_SIZE = 80;

export const TRACK_MATCH_SIMILARITY_THRESHOLD = 0.7;

export const GROQ_RATE_LIMIT_FALLBACK_DELAY_MS = 45_000;
