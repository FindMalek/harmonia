import { Section, Text } from "@react-email/components";
import {
	emailTheme,
	HarmoniaEmailShell,
	PrimaryButton,
} from "./_components/layout";

export type OrganizeCompleteEmailProps = {
	dashboardPlaylistsUrl: string;
	recipientName?: string | null;
	playlistsCreated: number;
	tracksOrganized: number;
	topPlaylists?: Array<{
		name: string;
		trackCount?: number | null;
	}>;
};

export function OrganizeCompleteEmail({
	dashboardPlaylistsUrl = "http://127.0.0.1:3003/playlists",
	recipientName,
	playlistsCreated = 0,
	tracksOrganized = 0,
	topPlaylists = [],
}: OrganizeCompleteEmailProps) {
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const playlistItems = Array.isArray(topPlaylists) ? topPlaylists : [];

	return (
		<HarmoniaEmailShell
			previewText="Your playlists are ready"
			title={`Your playlists are ready, ${safeName}`}
			subtitle="Your latest organize run has completed. Everything is synced and ready to listen in your dashboard."
			complianceText="You are receiving this transactional email because your organize run completed successfully."
		>
			<Section style={statsGrid}>
				<Section style={statCard}>
					<Text style={statLabel}>Playlists created</Text>
					<Text style={statValue}>{playlistsCreated}</Text>
				</Section>
				<Section style={statCard}>
					<Text style={statLabel}>Tracks organized</Text>
					<Text style={statValue}>{tracksOrganized}</Text>
				</Section>
			</Section>

			<Section style={listSection}>
				<Text style={sectionTitle}>Top playlists from this run</Text>
				{playlistItems.length > 0 ? (
					playlistItems.slice(0, 3).map((playlist, index) => (
						<Section key={`${playlist.name}-${index}`} style={playlistRow}>
							<Text style={playlistIndex}>{index + 1}</Text>
							<Section style={playlistMeta}>
								<Text style={playlistName}>{playlist.name}</Text>
								<Text style={playlistSubtext}>
									{playlist.trackCount && playlist.trackCount > 0
										? `${playlist.trackCount} tracks`
										: "Ready to play"}
								</Text>
							</Section>
						</Section>
					))
				) : (
					<Text style={emptyStateText}>
						We created your playlists and they are ready in your dashboard.
					</Text>
				)}
			</Section>

			<Section style={ctaWrap}>
				<PrimaryButton
					href={dashboardPlaylistsUrl}
					label="See more playlists"
				/>
			</Section>
		</HarmoniaEmailShell>
	);
}

OrganizeCompleteEmail.PreviewProps = {
	dashboardPlaylistsUrl: "http://127.0.0.1:3003/playlists",
	recipientName: "Malek",
	playlistsCreated: 7,
	tracksOrganized: 143,
	topPlaylists: [
		{ name: "Neon Night Drive", trackCount: 24 },
		{ name: "Focused Flow", trackCount: 18 },
		{ name: "Sunday Slow Burn", trackCount: 16 },
	],
} satisfies OrganizeCompleteEmailProps;

export default OrganizeCompleteEmail;

const statsGrid = {
	margin: "0 0 18px",
};

const statCard = {
	backgroundColor: emailTheme.colors.softBackground,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "12px",
	marginBottom: "10px",
	padding: "14px 14px 12px",
};

const statLabel = {
	color: emailTheme.colors.softText,
	fontSize: "12px",
	letterSpacing: "0.08em",
	margin: "0 0 4px",
	textTransform: "uppercase" as const,
};

const statValue = {
	color: emailTheme.colors.text,
	fontSize: "26px",
	fontWeight: "800",
	lineHeight: "1.2",
	margin: "0",
};

const listSection = {
	backgroundColor: emailTheme.colors.surface,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "12px",
	margin: "0 0 18px",
	padding: "12px",
};

const sectionTitle = {
	color: emailTheme.colors.text,
	fontSize: "14px",
	fontWeight: "700",
	lineHeight: "1.5",
	margin: "0 0 8px",
};

const playlistRow = {
	borderTop: `1px solid ${emailTheme.colors.border}`,
	padding: "10px 4px",
};

const playlistIndex = {
	backgroundColor: emailTheme.colors.softBackground,
	borderRadius: "999px",
	color: emailTheme.colors.primary,
	fontSize: "12px",
	fontWeight: "700",
	display: "inline-block",
	lineHeight: "1",
	margin: "0 10px 0 0",
	padding: "8px 10px",
	verticalAlign: "top" as const,
};

const playlistMeta = {
	display: "inline-block",
	maxWidth: "470px",
	verticalAlign: "top" as const,
};

const playlistName = {
	color: emailTheme.colors.text,
	fontSize: "14px",
	fontWeight: "600",
	lineHeight: "1.4",
	margin: "0",
};

const playlistSubtext = {
	color: emailTheme.colors.softText,
	fontSize: "12px",
	lineHeight: "1.5",
	margin: "2px 0 0",
};

const emptyStateText = {
	color: emailTheme.colors.softText,
	fontSize: "13px",
	lineHeight: "1.6",
	margin: "0",
};

const ctaWrap = {
	margin: "0",
};
