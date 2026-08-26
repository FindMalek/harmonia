import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import pRetry, { AbortError } from "p-retry";
import { logExternalApiCall } from "../../external-api-log";

export type GetSongBPMCallContext = {
	userId?: string | null;
	pipelineRunId?: number | null;
};

export type AudioFeatures = {
	tempo: number | null;
	key: number | null;
	mode: number | null;
	danceability: number | null;
	acousticness: number | null;
};

type GetSongBPMSearchResult = {
	id: string;
	title?: string;
	artist?: { name?: string };
};

type GetSongBPMSong = {
	id: string;
	tempo?: string | number;
	key_of?: string;
	danceability?: number | string;
	acousticness?: number | string;
};

/**
 * GetSongBPM's `/search/` matches by title only, so results can include
 * same-titled songs by other artists. No fallback to the top result: for a
 * common title, an unmatched artist means the top hit is a different song —
 * writing its audio features would silently corrupt this track's data,
 * which is worse than leaving it null.
 *
 * (GetSongBPM also exposes a combined title+artist search that avoids this
 * mismatch at the source — not adopted here since its exact query syntax
 * isn't reliably documented; worth revisiting if match rate turns out low.)
 */
export function findArtistMatch(
	results: GetSongBPMSearchResult[],
	artistName: string,
): GetSongBPMSearchResult | null {
	const normalizedArtist = artistName.trim().toLowerCase();
	return (
		results.find(
			(r) => r.artist?.name?.trim().toLowerCase() === normalizedArtist,
		) ?? null
	);
}

function tryParseJson(text: string): unknown {
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

// GetSongBPM's documented limit is 3,000 requests/hour (no paid tier). The
// 429 branch below retries with backoff instead of aborting — combined with
// the 6-peak-concurrent-request cap in stages/audio-features.ts, this is the
// defense against that limit rather than any explicit pacing here.
// Base retry config — no onFailedAttempt here so each call site can close over its url.
const RETRY_BASE = {
	retries: 3,
	minTimeout: 2000,
	factor: 2,
	randomize: true, // jitter prevents synchronised retry waves across concurrent workers
} as const;

// GetSongBPM's "key_of" strings (e.g. "C", "C#", "Em") into Spotify's
// 0-11 pitch-class + 0/1 (minor/major) mode convention.
const PITCH_CLASS: Record<string, number> = {
	C: 0,
	"C#": 1,
	Db: 1,
	D: 2,
	"D#": 3,
	Eb: 3,
	E: 4,
	F: 5,
	"F#": 6,
	Gb: 6,
	G: 7,
	"G#": 8,
	Ab: 8,
	A: 9,
	"A#": 10,
	Bb: 10,
	B: 11,
};

export function parseKeyOf(keyOf: string | undefined): {
	key: number | null;
	mode: number | null;
} {
	if (!keyOf) return { key: null, mode: null };
	const minor = keyOf.endsWith("m");
	const letter = minor ? keyOf.slice(0, -1) : keyOf;
	const pitchClass = PITCH_CLASS[letter];
	if (pitchClass === undefined) return { key: null, mode: null };
	return { key: pitchClass, mode: minor ? 0 : 1 };
}

function parseNumber(value: number | string | undefined): number | null {
	if (value === undefined) return null;
	const n = typeof value === "number" ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

// GetSongBPM returns danceability/acousticness on a 0-100 scale; the track
// schema's columns follow Spotify's 0.0-1.0 convention (see valence/energy).
function toUnitScale(value: number | null): number | null {
	return value === null ? null : value / 100;
}

function toSongFeatures(song: GetSongBPMSong): AudioFeatures {
	const { key, mode } = parseKeyOf(song.key_of);
	return {
		tempo: parseNumber(song.tempo),
		key,
		mode,
		danceability: toUnitScale(parseNumber(song.danceability)),
		acousticness: toUnitScale(parseNumber(song.acousticness)),
	};
}

// Generic helper for both /search/ and /song/ — url is closed over so the
// retry log always carries request context. api_key is stripped from the
// logged params so it never lands in external_api_call rows.
async function fetchGetSongBPM<T>(
	url: string,
	endpoint: "/search/" | "/song/",
	context: GetSongBPMCallContext = {},
): Promise<T | null> {
	let attempt = 0;
	return pRetry(
		async () => {
			const retryAttempt = attempt;
			attempt += 1;
			const params = Object.fromEntries(new URL(url).searchParams);
			params.api_key = "[redacted]";
			const startTime = Date.now();
			const response = await fetch(url);
			const durationMs = Date.now() - startTime;

			if (!response.ok) {
				const bodyText = await response.clone().text();
				const message = `GetSongBPM ${response.status}: ${response.statusText}`;
				await logExternalApiCall({
					userId: context.userId,
					pipelineRunId: context.pipelineRunId,
					provider: "getsongbpm",
					endpoint,
					method: "GET",
					httpStatus: response.status,
					requestPayload: params,
					responsePayload: tryParseJson(bodyText) as
						| Record<string, unknown>
						| undefined,
					durationMs,
					errorMessage: message,
					retryAttempt,
				});
				// 429 is rate-limited but transient — must NOT abort, let backoff handle it
				if (
					response.status !== 429 &&
					response.status >= 400 &&
					response.status < 500
				) {
					throw new AbortError(message);
				}
				// 429 and 5xx — retried with exponential back-off + jitter
				throw new Error(message);
			}

			await logExternalApiCall({
				userId: context.userId,
				pipelineRunId: context.pipelineRunId,
				provider: "getsongbpm",
				endpoint,
				method: "GET",
				httpStatus: response.status,
				requestPayload: params,
				durationMs,
				retryAttempt,
			});

			return (await response.json()) as T;
		},
		{
			...RETRY_BASE,
			onFailedAttempt: (error) => {
				logger.debug(
					{ attempt: error.attemptNumber, retriesLeft: error.retriesLeft, url },
					"GetSongBPM request failed, retrying",
				);
			},
		},
	);
}

export async function getAudioFeaturesFromGetSongBPM(
	params: { trackName: string; artistName: string },
	context: GetSongBPMCallContext = {},
): Promise<AudioFeatures | null> {
	if (!env.HARMONIA_GETSONGBPM_API_KEY) return null;

	const searchParams = new URLSearchParams({
		api_key: env.HARMONIA_GETSONGBPM_API_KEY,
		type: "song",
		lookup: params.trackName,
	});

	const searchResponse = await fetchGetSongBPM<{
		search: GetSongBPMSearchResult[] | string;
	}>(
		`https://api.getsongbpm.com/search/?${searchParams.toString()}`,
		"/search/",
		context,
	);

	const results = searchResponse?.search;
	if (!Array.isArray(results) || results.length === 0) return null;

	const match = findArtistMatch(results, params.artistName);
	if (!match) return null;

	const songParams = new URLSearchParams({
		api_key: env.HARMONIA_GETSONGBPM_API_KEY,
		id: match.id,
	});

	const songResponse = await fetchGetSongBPM<{ song: GetSongBPMSong }>(
		`https://api.getsongbpm.com/song/?${songParams.toString()}`,
		"/song/",
		context,
	);

	return songResponse?.song ? toSongFeatures(songResponse.song) : null;
}
