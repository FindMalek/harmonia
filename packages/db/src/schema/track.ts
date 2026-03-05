import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	vector,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { genreDomain } from "./genre-domain";

export const track = pgTable(
	"track",
	{
		// Identity
		id: text("id").primaryKey(), // Spotify track ID
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		spotifyUri: text("spotify_uri").notNull(),

		// Core metadata (Spotify)
		name: text("name").notNull(),
		artistNames: text("artist_names").notNull(), // JSON array as text string
		albumName: text("album_name"),
		durationMs: integer("duration_ms"),
		spotifyGenres: jsonb("spotify_genres").$type<string[]>(), // Raw artist genres

		// Genre domain (our classifier output)
		genreDomainId: integer("genre_domain_id").references(() => genreDomain.id),

		// Spotify audio features (all 10)
		valence: real("valence"),
		energy: real("energy"),
		danceability: real("danceability"),
		tempo: real("tempo"),
		acousticness: real("acousticness"),
		instrumentalness: real("instrumentalness"),
		speechiness: real("speechiness"),
		liveness: real("liveness"),
		key: integer("key"),
		mode: integer("mode"),

		// Lyrics (LRCLib)
		lyrics: text("lyrics"),
		syncedLyrics: text("synced_lyrics"),
		lyricsInstrumental: boolean("lyrics_instrumental"),
		lrclibId: integer("lrclib_id"),
		lyricsFetchedAt: timestamp("lyrics_fetched_at"),
		lyricsStatus: text("lyrics_status"),

		// LLM classification (Groq) — full structured output
		llmMood: text("llm_mood"),
		llmTags: jsonb("llm_tags").$type<{
			secondaryMoods: string[];
			themes: string[];
			topics: string[];
			vibe: string[];
			vocalType: string;
			energyLevel: string;
			language: string;
			era: string;
		}>(),
		llmClassifiedAt: timestamp("llm_classified_at"),

		// Embedding (OpenAI)
		embedding: vector("embedding", { dimensions: 1536 }),
		embeddingGeneratedAt: timestamp("embedding_generated_at"),
		embeddingInput: text("embedding_input"), // What we sent (for debugging)

		// Domain assignment
		domainAssignedAt: timestamp("domain_assigned_at"),

		// Full analysis snapshot (optional — for audit/debug)
		analysisSnapshot: jsonb("analysis_snapshot").$type<{
			llm: Record<string, unknown>;
			domain: string | null;
			embeddingDims?: number;
			modelVersions?: { llm?: string; embedding?: string }; // e.g. openai/gpt-oss-120b
		}>(),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("track_user_id_idx").on(table.userId),
		index("track_genre_domain_id_idx").on(table.genreDomainId),
		index("track_lyrics_status_idx").on(table.lyricsStatus),
		index("track_embedding_idx").using(
			"hnsw",
			table.embedding.op("vector_cosine_ops"),
		),
	],
);
