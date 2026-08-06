import "@harmonia/ui/styles/globals.css";

import type { Metadata, Viewport } from "next";

import AppProviders from "@/components/layout/app-providers";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const title = "Harmonia Admin";
const description = "Internal admin dashboard for Harmonia.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: title,
		template: "%s — Harmonia Admin",
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
		siteName: "Harmonia Admin",
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
