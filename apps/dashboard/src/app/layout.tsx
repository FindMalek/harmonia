import "@harmonia/ui/styles/globals.css";

import type { Metadata } from "next";

import AppProviders from "@/components/layout/app-providers";

export const metadata: Metadata = {
	title: "Harmonia Dashboard",
	description: "Harmonia Dashboard",
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
