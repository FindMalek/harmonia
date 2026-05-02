"use client";

import { authClient } from "@/shared/api/auth-client";
import { orpc } from "@/shared/api/orpc";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";

function toSyncDate(value: unknown): Date | null {
	if (value == null) {
		return null;
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	if (typeof value === "string" || typeof value === "number") {
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	return null;
}

export function useSettingsController() {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { theme, setTheme, resolvedTheme } = useTheme();

	const spotifyLinked = useQuery(
		orpc.hasSpotifyLinked.queryOptions({ input: {} }),
	);
	const libraryStats = useQuery(
		orpc.spotify.libraryStats.queryOptions({ input: {} }),
	);

	const signOut = async () => {
		await authClient.signOut();
		window.location.href = "/login";
	};

	return {
		session,
		sessionPending,
		email: session?.user.email ?? null,
		spotifyLinked: spotifyLinked.data ?? false,
		spotifyLoading: spotifyLinked.isLoading,
		lastSync: toSyncDate(libraryStats.data?.updatedAt),
		statsLoading: libraryStats.isLoading,
		theme,
		resolvedTheme,
		setTheme,
		signOut,
	};
}
