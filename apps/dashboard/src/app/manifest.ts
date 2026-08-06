import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Harmonia Dashboard",
		short_name: "Harmonia",
		description: "Manage your Spotify library and playlists in Harmonia.",
		theme_color: "#173322",
		background_color: "#173322",
		display: "standalone",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icon-384.png", sizes: "384x384", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
	};
}
