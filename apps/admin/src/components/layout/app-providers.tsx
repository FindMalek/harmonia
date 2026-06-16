"use client";

import { Providers } from "@harmonia/ui";

import { queryClient } from "@/shared/api/orpc";

export default function AppProviders({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Providers queryClient={queryClient}>{children}</Providers>;
}
