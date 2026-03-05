export type SpotifySavedTrackItem = {
	added_at: string;
	track: SpotifyTrack;
};

export type SpotifyTrack = {
	id: string;
	uri: string;
	name: string;
	artists: { name: string }[];
	album: {
		name: string;
	};
	duration_ms: number;
};

export type SpotifySavedTracksResponse = {
	items: SpotifySavedTrackItem[];
	next: string | null;
};

export type SpotifyAudioFeatures = {
	id: string;
	valence: number | null;
	energy: number | null;
	danceability: number | null;
	tempo: number | null;
	acousticness: number | null;
	instrumentalness: number | null;
	speechiness: number | null;
	liveness: number | null;
	key: number | null;
	mode: number | null;
};

export type SpotifyAudioFeaturesResponse = {
	audio_features: SpotifyAudioFeatures[];
};

