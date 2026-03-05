import { logger } from "@harmonia/logger";
import pRetry from "p-retry";

type LRCLibTrack = {
	id: number;
	plainLyrics: string | null;
	syncedLyrics: string | null;
	instrumental: boolean;
};

export async function getLyricsFromLRCLib(params: {
	trackName: string;
	artistName: string;
	albumName?: string | null;
	durationMs?: number | null;
}): Promise<LRCLibTrack | null> {
	const searchParams = new URLSearchParams({
		track_name: params.trackName,
		artist_name: params.artistName,
	});

	if (params.albumName) {
		searchParams.set("album_name", params.albumName);
	}

	if (params.durationMs && Number.isFinite(params.durationMs)) {
		searchParams.set(
			"duration",
			Math.round(params.durationMs / 1000).toString(),
		);
	}

	const url = `https://lrclib.net/api/get?${searchParams.toString()}`;

	return pRetry(
		async () => {
			const response = await fetch(url);

			if (response.status === 404) {
				return null;
			}

			if (response.status === 429) {
				throw new Error("LRCLib rate limit hit (429)");
			}

			if (!response.ok) {
				const err = new Error(
					`LRCLib ${response.status}: ${response.statusText}`,
				);
				(err as NodeJS.ErrnoException).code = "ABORT_RETRY";
				throw err;
			}

			const json = (await response.json()) as {
				id: number;
				plainLyrics?: string | null;
				syncedLyrics?: string | null;
				instrumental?: boolean;
			};

			return {
				id: json.id,
				plainLyrics: json.plainLyrics ?? null,
				syncedLyrics: json.syncedLyrics ?? null,
				instrumental: json.instrumental ?? false,
			};
		},
		{
			retries: 3,
			minTimeout: 1000,
			onFailedAttempt: (error) => {
				logger.warn(
					{
						attempt: error.attemptNumber,
						retriesLeft: error.retriesLeft,
						url,
					},
					"LRCLib request failed, retrying",
				);
			},
		},
	);
}
