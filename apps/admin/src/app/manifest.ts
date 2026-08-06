import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Harmonia Admin",
		short_name: "Harmonia Admin",
		description: "Internal admin dashboard for Harmonia.",
		theme_color: "#1c2350",
		background_color: "#1c2350",
		display: "standalone",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icon-384.png", sizes: "384x384", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
	};
}
