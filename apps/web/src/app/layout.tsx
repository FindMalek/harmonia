import "@harmonia/ui/styles/globals.css";
import type { Metadata } from "next";

import AppHeader from "@/components/app-header";
import AppProviders from "@/components/app-providers";

export const metadata: Metadata = {
	title: "harmonia",
	description: "harmonia",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<AppProviders>
					<div className="grid h-svh grid-rows-[auto_1fr]">
						<AppHeader />
						{children}
					</div>
				</AppProviders>
			</body>
		</html>
	);
}
