"use client";

import {
	DashboardSettingsNavRow,
	DashboardSettingsRow,
	DashboardSettingsSection,
	DashboardSettingsSkeleton,
} from "@/components/app/dashboard-settings-section";
import { PageHeader } from "@/components/shared/page-header";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";
import { Badge, Button } from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

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
		userPlan,
		planExpiresAt,
		resolvedTheme,
		setTheme,
		signOut,
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

	const polarCheckoutUrl = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || "#";

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
						spotifyLoading ? (
							"..."
						) : spotifyLinked ? (
							<span className="flex items-center gap-1.5">
								<span className="size-2 rounded-full bg-green-500" />
								Connected
							</span>
						) : (
							"Not connected"
						)
					}
				/>
				<DashboardSettingsRow label="Last sync" value={lastSyncText} />
			</DashboardSettingsSection>

			<DashboardSettingsSection label="ACCOUNT">
				<DashboardSettingsRow label="Email" value={email ?? "..."} />
				<DashboardSettingsRow 
					label="Plan" 
					value={
						userPlan === "pro" ? (
							<div className="flex items-center gap-2">
								<Badge variant="default" className="bg-purple-600 text-white">PRO</Badge>
								{planExpiresAt && (
									<span className="text-xs text-muted-foreground">
										Expires {planExpiresAt.toLocaleDateString()}
									</span>
								)}
							</div>
						) : (
							<div className="flex items-center gap-2">
								<span>Free</span>
								<Button size="sm" variant="outline" asChild>
									<a href={polarCheckoutUrl} target="_blank" rel="noreferrer">
										Upgrade
									</a>
								</Button>
							</div>
						)
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
