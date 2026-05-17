import { logger } from "@harmonia/logger";
import pRetry, { AbortError } from "p-retry";

type LRCLibTrack = {
	id: number;
	plainLyrics: string | null;
	syncedLyrics: string | null;
	instrumental: boolean;
};

type LRCLibRawTrack = {
	id: number;
	plainLyrics?: string | null;
	syncedLyrics?: string | null;
	instrumental?: boolean;
};

const RETRY_OPTIONS = {
	retries: 3,
	minTimeout: 2000,
	factor: 2,
	onFailedAttempt: (error: { attemptNumber: number; retriesLeft: number }) => {
		logger.debug(
			{ attempt: error.attemptNumber, retriesLeft: error.retriesLeft },
			"LRCLib request failed, retrying",
		);
	},
} as const;

function toTrack(raw: LRCLibRawTrack): LRCLibTrack {
	return {
		id: raw.id,
		plainLyrics: raw.plainLyrics ?? null,
		syncedLyrics: raw.syncedLyrics ?? null,
		instrumental: raw.instrumental ?? false,
	};
}

async function fetchLRCLib(url: string): Promise<LRCLibRawTrack | null> {
	return pRetry(async () => {
		const response = await fetch(url);

		if (response.status === 404) return null;

		if (!response.ok) {
			const message = `LRCLib ${response.status}: ${response.statusText}`;
			if (response.status >= 400 && response.status < 500) {
				throw new AbortError(message);
			}
			// 503 and other 5xx — let p-retry back off (2 s → 4 s → 8 s)
			throw new Error(message);
		}

		return (await response.json()) as LRCLibRawTrack;
	}, RETRY_OPTIONS);
}

export async function getLyricsFromLRCLib(params: {
	trackName: string;
	artistName: string;
	albumName?: string | null;
	durationMs?: number | null;
}): Promise<LRCLibTrack | null> {
	// ── 1. Exact-match via /api/get ──────────────────────────────────────────
	const getParams = new URLSearchParams({
		track_name: params.trackName,
		artist_name: params.artistName,
	});
	if (params.albumName) getParams.set("album_name", params.albumName);
	if (params.durationMs && Number.isFinite(params.durationMs)) {
		getParams.set("duration", Math.round(params.durationMs / 1000).toString());
	}

	const exact = await fetchLRCLib(
		`https://lrclib.net/api/get?${getParams.toString()}`,
	);
	if (exact) return toTrack(exact);

	// ── 2. Fuzzy fallback via /api/search ────────────────────────────────────
	// /api/get returns 404 for variant spellings, missing duration, etc.
	// /api/search only needs track_name + artist_name and returns the best match.
	const searchParams = new URLSearchParams({
		track_name: params.trackName,
		artist_name: params.artistName,
	});

	const results = await pRetry(async () => {
		const response = await fetch(
			`https://lrclib.net/api/search?${searchParams.toString()}`,
		);
		if (!response.ok) {
			if (response.status >= 400 && response.status < 500)
				throw new AbortError(`LRCLib search ${response.status}`);
			throw new Error(`LRCLib search ${response.status}`);
		}
		return (await response.json()) as LRCLibRawTrack[];
	}, RETRY_OPTIONS);

	const first = results[0];
	return first ? toTrack(first) : null;
}
