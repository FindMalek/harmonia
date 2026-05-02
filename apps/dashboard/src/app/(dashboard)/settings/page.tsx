"use client";

import {
	DashboardSettingsNavRow,
	DashboardSettingsRow,
	DashboardSettingsSection,
} from "@/components/app/dashboard-settings-section";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";
import { Badge, Button } from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";

export default function SettingsPage() {
	const {
		email,
		spotifyLinked,
		spotifyLoading,
		lastSync,
		statsLoading,
		resolvedTheme,
		setTheme,
		signOut,
	} = useSettingsController();

	const lastSyncText = lastSync
		? formatDistanceToNow(lastSync, { addSuffix: true })
		: statsLoading
			? "..."
			: "Never";

	const themeLabel =
		resolvedTheme === "dark"
			? "Dark"
			: resolvedTheme === "light"
				? "Light"
				: "System default";

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage your account and app preferences.
				</p>
			</div>

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
				<DashboardSettingsRow label="Plan" value="Free" />
			</DashboardSettingsSection>

			<DashboardSettingsSection label="PREFERENCES">
				<DashboardSettingsNavRow
					label="Theme"
					subtitle={themeLabel}
					onClick={() =>
						setTheme(resolvedTheme === "dark" ? "light" : "dark")
					}
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
