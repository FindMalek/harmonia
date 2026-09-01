import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Sonaraem",
		short_name: "Sonaraem",
		description:
			"Sonaraem uses AI to analyze your music library and automatically create meaningful playlists from your songs.",
		theme_color: "#14161a",
		background_color: "#14161a",
		display: "standalone",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icon-384.png", sizes: "384x384", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
	};
}
