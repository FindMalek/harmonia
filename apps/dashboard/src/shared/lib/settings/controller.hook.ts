"use client";

import { isPro } from "@harmonia/common/utils/plan";
import { env } from "@harmonia/env/web";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { authClient } from "@/shared/api/auth-client";
import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
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

type PlanUser = {
	plan?: string | null;
	planExpiresAt?: string | Date | null;
} | null;

function readPlan(user: PlanUser): {
	plan: "free" | "pro";
	planExpiresAt: Date | null;
} {
	const plan = typeof user?.plan === "string" ? user.plan : "free";
	const planExpiresAt = toSyncDate(user?.planExpiresAt);
	return { plan: plan === "pro" ? "pro" : "free", planExpiresAt };
}

export function useSettingsController() {
	const queryClient = useQueryClient();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { theme, setTheme, resolvedTheme } = useTheme();

	const spotifyLinked = useQuery(
		orpc.hasSpotifyLinked.queryOptions({ input: {} }),
	);
	const libraryStats = useQuery(
		orpc.spotify.libraryStats.queryOptions({ input: {} }),
	);
	const emailPreferences = useQuery(
		orpc.emailPreferences.get.queryOptions({ input: {} }),
	);
	const updateEmailPreferences = useMutation(
		orpc.emailPreferences.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: queryKeys.emailPreferences(),
				});
			},
			onError: (error) => {
				toastError(error.message ?? "Failed to update email preferences");
			},
		}),
	);

	const createCheckout = useMutation({
		mutationFn: async () => {
			if (!env.NEXT_PUBLIC_POLAR_PRODUCT_ID) {
				throw new Error("Billing is not configured yet.");
			}

			const res = await fetch("/api/billing/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					productPriceId: env.NEXT_PUBLIC_POLAR_PRODUCT_ID,
				}),
			});

			if (!res.ok) {
				throw new Error("Failed to create checkout session");
			}

			const data = (await res.json()) as { url?: unknown };
			if (typeof data.url !== "string") {
				throw new Error("Invalid checkout response");
			}
			return data.url;
		},
		onSuccess: (url) => {
			window.location.href = url;
		},
		onError: (error) => {
			toastError(error.message ?? "Failed to start checkout. Please try again.");
		},
	});

	const signOut = async () => {
		useOrganizeStore.getState().setActiveRunId(null);
		useOrganizeStore.getState().setIsAnalysisDrawerOpen(false);
		await authClient.signOut();
		window.location.href = "/login";
	};

	const user = session?.user as PlanUser;
	const { plan, planExpiresAt } = readPlan(user);

	return {
		session,
		sessionPending,
		email: user?.email ?? null,
		plan,
		planExpiresAt,
		isPro: isPro({ plan, planExpiresAt }),
		checkoutLoading: createCheckout.isPending,
		createCheckout: () => createCheckout.mutate(),
		spotifyLinked: spotifyLinked.data ?? false,
		spotifyLoading: spotifyLinked.isLoading,
		lastSync: toSyncDate(libraryStats.data?.updatedAt),
		statsLoading: libraryStats.isLoading,
		emailPreferences: emailPreferences.data ?? null,
		emailPreferencesLoading: emailPreferences.isLoading,
		updateEmailPreferences,
		theme,
		resolvedTheme,
		setTheme,
		signOut,
	};
}
