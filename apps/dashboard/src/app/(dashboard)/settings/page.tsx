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
import { useSettingsController } from "@/shared/lib/settings/controller.hook";

export default function SettingsPage() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const {
		email,
		emailPreferences,
		emailPreferencesLoading,
		spotifyLinked,
		spotifyLoading,
		lastSync,
		statsLoading,
		resolvedTheme,
		setTheme,
		signOut,
		updateEmailPreferences,
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
				<DashboardSettingsRow
					label="Transactional emails"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.transactionalEnabled ?? true}
							onToggle={() =>
								updateEmailPreferences.mutate({
									transactionalEnabled: !(
										emailPreferences?.transactionalEnabled ?? true
									),
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Product updates"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.productUpdatesEnabled ?? false}
							onToggle={() =>
								updateEmailPreferences.mutate({
									productUpdatesEnabled: !(
										emailPreferences?.productUpdatesEnabled ?? false
									),
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Feedback requests"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.feedbackEnabled ?? false}
							onToggle={() =>
								updateEmailPreferences.mutate({
									feedbackEnabled: !(
										emailPreferences?.feedbackEnabled ?? false
									),
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Marketing emails"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.marketingEnabled ?? false}
							onToggle={() =>
								updateEmailPreferences.mutate({
									marketingEnabled: !(
										emailPreferences?.marketingEnabled ?? false
									),
								})
							}
						/>
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

function PreferenceButton({
	enabled,
	loading,
	onToggle,
}: {
	enabled: boolean;
	loading: boolean;
	onToggle: () => void;
}) {
	if (loading) return "...";

	return (
		<Button
			variant={enabled ? "default" : "outline"}
			size="sm"
			onClick={onToggle}
		>
			{enabled ? "Enabled" : "Disabled"}
		</Button>
	);
}
