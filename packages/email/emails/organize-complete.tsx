import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

export type OrganizeCompleteEmailProps = {
	dashboardPlaylistsUrl: string;
	recipientName?: string | null;
	topPlaylists?: Array<{
		name: string;
		trackCount?: number | null;
	}>;
	/** Present only for the weekly cron digest variant (#168); manual runs omit this. */
	digest?: {
		createdCount: number;
		updatedCount: number;
		tracksOrganized: number;
		newPlaylistNames: string[];
	};
};

export function OrganizeCompleteEmail({
	dashboardPlaylistsUrl = "http://127.0.0.1:3003/playlists",
	recipientName,
	topPlaylists = [],
	digest,
}: OrganizeCompleteEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const playlistItems = Array.isArray(topPlaylists) ? topPlaylists : [];
	const remainingPlaylists = playlistItems.length - 5;

	return (
		<EmailThemeProvider
			preview={
				<Preview>
					{digest ? "Your weekly playlist digest" : "Your playlists are ready"}
				</Preview>
			}
		>
			<Body
				className={`mx-auto my-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`mx-auto my-[40px] max-w-[600px] p-[20px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: lightStyles.container.borderColor,
					}}
				>
					<Logo />
					<Heading
						className={`mt-[24px] mb-[8px] text-center font-normal font-serif text-[21px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						{digest
							? `Your weekly digest, ${safeName}`
							: `Your playlists are ready, ${safeName}`}
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						{digest
							? `This week: ${digest.createdCount} new playlist${digest.createdCount === 1 ? "" : "s"}, ${digest.updatedCount} playlist${digest.updatedCount === 1 ? "" : "s"} updated, ${digest.tracksOrganized} tracks organized.`
							: "Your latest organize run has completed. Everything is synced and ready to listen in your dashboard."}
					</Text>

					{digest &&
						digest.newPlaylistNames.length > 0 &&
						digest.newPlaylistNames.map((name, index) => (
							<Section
								key={`${name}-${index}`}
								className={`border-t border-solid py-[10px] ${themeClasses.border}`}
								style={{ borderColor: lightStyles.container.borderColor }}
							>
								<Text
									className={`m-0 font-medium text-[14px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									{index + 1}. {name}
								</Text>
							</Section>
						))}

					{!digest &&
						playlistItems.length > 0 &&
						playlistItems.slice(0, 5).map((playlist, index) => (
							<Section
								key={`${playlist.name}-${index}`}
								className={`border-t border-solid py-[10px] ${themeClasses.border}`}
								style={{ borderColor: lightStyles.container.borderColor }}
							>
								<Text
									className={`m-0 font-medium text-[14px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									{index + 1}. {playlist.name}
								</Text>
								<Text
									className={`m-0 mt-[4px] text-[12px] ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									{playlist.trackCount && playlist.trackCount > 0
										? `${playlist.trackCount} tracks`
										: "Ready to play"}
								</Text>
							</Section>
						))}

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={dashboardPlaylistsUrl}>
							{remainingPlaylists > 0
								? `See ${remainingPlaylists} more playlist${remainingPlaylists === 1 ? "" : "s"}`
								: "View your playlists"}
						</Button>
					</Section>

					<Footer complianceText="You are receiving this transactional email because your organize run completed successfully." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

OrganizeCompleteEmail.PreviewProps = {
	dashboardPlaylistsUrl: "http://127.0.0.1:3003/playlists",
	recipientName: "Malek",
	topPlaylists: [
		{ name: "Neon Night Drive", trackCount: 24 },
		{ name: "Focused Flow", trackCount: 18 },
		{ name: "Sunday Slow Burn", trackCount: 16 },
	],
} satisfies OrganizeCompleteEmailProps;

export default OrganizeCompleteEmail;
