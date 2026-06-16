import "@harmonia/ui/styles/globals.css";
import type { Metadata } from "next";

import AppProviders from "@/components/app-providers";

export const metadata: Metadata = {
	title: "Harmonia — Your Spotify library, intelligently organized.",
	description:
		"Harmonia uses AI to analyze your music library and automatically create meaningful playlists from your songs.",
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
