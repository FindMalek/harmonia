"use client";

import { Providers } from "@sonaraem/ui";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { queryClient } from "@/shared/api/orpc";

export default function AppProviders({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<NuqsAdapter>
			<Providers queryClient={queryClient}>{children}</Providers>
		</NuqsAdapter>
	);
}
