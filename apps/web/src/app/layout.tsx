import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import AppHeader from "@/components/app-header";
import AppProviders from "@/components/app-providers";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

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
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
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
