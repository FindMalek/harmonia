"use client";

import { isPro } from "@harmonia/common";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { authClient } from "@/shared/api/auth-client";
import { orpc } from "@/shared/api/orpc";
import { useOrganizeStore } from "@/shared/lib/organize/store";

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

/**
 * Controller hook for the settings page.
 * 
 * Manages theme preferences, Spotify integration status, session management,
 * and subscription billing state (Pro/Free).
 */
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
		useOrganizeStore.getState().setActiveRunId(null);
		useOrganizeStore.getState().setIsAnalysisDrawerOpen(false);
		await authClient.signOut();
		window.location.href = "/login";
	};

	const user = session?.user;
	interface SubscriptionUser {
		plan?: string;
		planExpiresAt?: string | number | Date | null;
	}
	const subUser = user as SubscriptionUser | undefined;
	const rawPlan = subUser?.plan ?? "free";
	const planExpiresAt = subUser?.planExpiresAt
		? new Date(subUser.planExpiresAt)
		: null;
	const hasPro = isPro({ plan: rawPlan, planExpiresAt });

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
		plan: hasPro ? "Pro" : "Free",
		isPro: hasPro,
	};
}

