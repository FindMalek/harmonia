"use client";

import { Providers } from "@sonaraem/ui";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/orpc";

export default function AppProviders({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Providers queryClient={queryClient}>
			{children}
			<ReactQueryDevtools />
		</Providers>
	);
}
