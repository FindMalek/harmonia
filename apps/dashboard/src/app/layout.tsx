import "@harmonia/ui/styles/globals.css";

import type { Metadata, Viewport } from "next";

import AppProviders from "@/components/layout/app-providers";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const title = "Harmonia Dashboard";
const description = "Manage your Spotify library and playlists in Harmonia.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: title,
		template: "%s — Harmonia Dashboard",
	},
	description,
	robots: {
		index: false,
		follow: false,
	},
	openGraph: {
		type: "website",
		url: siteUrl,
		title,
		description,
		siteName: "Harmonia Dashboard",
	},
	twitter: {
		card: "summary",
		title,
		description,
	},
};

export const viewport: Viewport = {
	themeColor: "#173322",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
