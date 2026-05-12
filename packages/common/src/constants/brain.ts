export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_BATCH_SIZE = 256;
export const EMBEDDING_CONCURRENCY = 3;

export const CLASSIFICATION_BATCH_SIZE = 12;
export const CLASSIFICATION_CONCURRENCY = 2;

/** DBSCAN params: minPts, eps. Tuned for ~1500-dim embeddings, cosine distance. */
export const CLUSTER_MIN_POINTS = 5;
export const CLUSTER_EPSILON = 0.5;
export const CLUSTER_MIN_SIZE = 20;
export const CLUSTER_MAX_SIZE = 80;

export const TRACK_MATCH_SIMILARITY_THRESHOLD = 0.7;
