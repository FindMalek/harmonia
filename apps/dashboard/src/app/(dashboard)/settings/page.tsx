"use client";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Badge, Button } from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	DashboardSettingsNavRow,
	DashboardSettingsRow,
	DashboardSettingsSection,
	DashboardSettingsSkeleton,
} from "@/components/app/dashboard-settings-section";
import { PageHeader } from "@/components/shared/page-header";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";

export default function SettingsPage() {
	const router = useRouter();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const {
		email,
		plan,
		planExpiresAt,
		isPro,
		checkoutLoading,
		createCheckout,
		spotifyLinked,
		spotifyLoading,
		lastSync,
		statsLoading,
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

	const planLabel = plan === "pro" ? "Pro" : "Free";
	const expiryText = planExpiresAt
		? ` (Expires ${formatDistanceToNow(new Date(planExpiresAt), { addSuffix: true })})`
		: "";

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
						<div className="flex flex-col items-end gap-2">
							<span className="capitalize">
								{planLabel}
								{expiryText}
							</span>
							{!isPro && (
								<Button
									size="sm"
									variant="outline"
									onClick={createCheckout}
									disabled={checkoutLoading}
								>
									{checkoutLoading ? "Redirecting..." : "Upgrade to Pro"}
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
				<DashboardSettingsNavRow
					label="Notifications"
					subtitle="Manage email alerts and marketing preferences"
					onClick={() =>
						router.push(
							DASHBOARD_ROUTES.settings.children.notifications.path,
						)
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
