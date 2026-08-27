import "@sonaraem/ui/styles/globals.css";
import type { Metadata, Viewport } from "next";

import AppProviders from "@/components/app-providers";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const title = "Sonaraem — Your Spotify library, intelligently organized.";
const description =
	"Sonaraem uses AI to analyze your music library and automatically create meaningful playlists from your songs.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: title,
		template: "%s — Sonaraem",
	},
	description,
	keywords: [
		"Spotify playlist generator",
		"AI music organization",
		"Spotify library",
		"automatic playlists",
		"music discovery AI",
	],
	authors: [{ name: "Sonaraem" }],
	creator: "Sonaraem",
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		type: "website",
		url: siteUrl,
		title,
		description,
		siteName: "Sonaraem",
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
	},
};

export const viewport: Viewport = {
	themeColor: "#14161a",
};

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			name: "Sonaraem",
			url: siteUrl,
		},
		{
			"@type": "SoftwareApplication",
			name: "Sonaraem",
			applicationCategory: "MusicApplication",
			operatingSystem: "Web",
			description,
		},
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
				/>
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
