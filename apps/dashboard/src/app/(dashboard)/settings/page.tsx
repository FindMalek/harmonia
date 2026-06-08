"use client";

import { Badge, Button } from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import {
	DashboardSettingsNavRow,
	DashboardSettingsRow,
	DashboardSettingsSection,
	DashboardSettingsSkeleton,
} from "@/components/app/dashboard-settings-section";
import { PageHeader } from "@/components/shared/page-header";
import { env } from "@/lib/env";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";

export default function SettingsPage() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const {
		email,
		spotifyLinked,
		spotifyLoading,
		lastSync,
		statsLoading,
		resolvedTheme,
		setTheme,
		signOut,
		plan,
		isPro,
	} = useSettingsController();

	if (!mounted) {
		return <DashboardSettingsSkeleton />;
	}

	const lastSyncText = statsLoading
		? "..."
		: lastSync
			? formatDistanceToNow(lastSync, { addSuffix: true })
			: "Never";

	const themeLabel =
		resolvedTheme === "dark"
			? "Dark"
			: resolvedTheme === "light"
				? "Light"
				: "System default";

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Settings"
				description="Manage your account and app preferences."
			/>

			<DashboardSettingsSection label="CONNECTED SERVICES">
				<DashboardSettingsRow
					label="Spotify"
					value={
						<span className="flex items-center gap-1.5">
							{spotifyLoading ? (
								"..."
							) : spotifyLinked ? (
								<>
									<span className="size-2 rounded-full bg-green-500" />
									Connected
								</>
							) : (
								"Not connected"
							)}
						</span>
					}
				/>
				<DashboardSettingsRow label="Last sync" value={lastSyncText} />
			</DashboardSettingsSection>

			<DashboardSettingsSection label="ACCOUNT">
				<DashboardSettingsRow label="Email" value={email ?? "..."} />
				<DashboardSettingsRow
					label="Plan"
					value={
						<div className="flex items-center gap-2">
							<Badge variant={isPro ? "default" : "outline"}>{plan}</Badge>
							{!isPro && (
								<Button
									variant="outline"
									size="xs"
									className="h-6 px-2 text-xs"
									asChild
								>
									<a
										href={`${env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || "https://polar.sh"}${
											(
												env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || "https://polar.sh"
											).includes("?")
												? "&"
												: "?"
										}customer_email=${encodeURIComponent(email || "")}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										Upgrade to Pro
									</a>
								</Button>
							)}
						</div>
					}
				/>
			</DashboardSettingsSection>

			<DashboardSettingsSection label="PREFERENCES">
				<DashboardSettingsNavRow
					label="Theme"
					subtitle={themeLabel}
					onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
				/>
				<DashboardSettingsRow
					label="Analysis Frequency"
					value={
						<Badge variant="outline" className="text-xs">
							Coming soon
						</Badge>
					}
				/>
			</DashboardSettingsSection>

			<Button
				variant="destructive"
				className="w-full"
				onClick={() => void signOut()}
			>
				Sign out
			</Button>
		</div>
	);
}
