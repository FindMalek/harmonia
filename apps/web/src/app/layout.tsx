import "@harmonia/ui/styles/globals.css";
import { env } from "@harmonia/env/web";
import type { Metadata } from "next";

import AppProviders from "@/components/app-providers";

const siteUrl = env.NEXT_PUBLIC_HARMONIA_WEB_URL ?? "http://127.0.0.1:3001";
const title = "Harmonia — Your Spotify library, intelligently organized.";
const description =
	"Harmonia uses AI to analyze your music library and automatically create meaningful playlists from your songs.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: title,
		template: "%s — Harmonia",
	},
	description,
	keywords: [
		"Spotify playlist generator",
		"AI music organization",
		"Spotify library",
		"automatic playlists",
		"music discovery AI",
	],
	authors: [{ name: "Harmonia" }],
	creator: "Harmonia",
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		type: "website",
		url: siteUrl,
		title,
		description,
		siteName: "Harmonia",
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
	},
};

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			name: "Harmonia",
			url: siteUrl,
		},
		{
			"@type": "SoftwareApplication",
			name: "Harmonia",
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
