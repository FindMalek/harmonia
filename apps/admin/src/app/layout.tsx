import "@sonaraem/ui/styles/globals.css";

import type { Metadata, Viewport } from "next";

import AppProviders from "@/components/layout/app-providers";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const title = "Sonaraem Admin";
const description = "Internal admin dashboard for Sonaraem.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: title,
		template: "%s — Sonaraem Admin",
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
		siteName: "Sonaraem Admin",
	},
	twitter: {
		card: "summary",
		title,
		description,
	},
};

export const viewport: Viewport = {
	themeColor: "#1c2350",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
