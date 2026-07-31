export function normalizePlaylistName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[.,!?'"]/g, "");
}
