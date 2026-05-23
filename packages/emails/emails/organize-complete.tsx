import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";

export type OrganizeCompleteEmailProps = {
	dashboardPlaylistsUrl: string;
	recipientName?: string | null;
	playlistsCreated: number;
	tracksOrganized: number;
};

export function OrganizeCompleteEmail({
	dashboardPlaylistsUrl,
	recipientName,
	playlistsCreated,
	tracksOrganized,
}: OrganizeCompleteEmailProps) {
	const safeName = recipientName?.trim().length ? recipientName : "there";

	return (
		<Html>
			<Head />
			<Preview>Your playlists are ready</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>
						Your playlists are ready, {safeName}
					</Heading>
					<Text style={text}>
						Your latest organize run has finished and your playlists are now
						available in Harmonia.
					</Text>

					<Section style={statsSection}>
						<Text style={statLabel}>Playlists created</Text>
						<Text style={statValue}>{playlistsCreated}</Text>
						<Text style={statLabel}>Tracks organized</Text>
						<Text style={statValue}>{tracksOrganized}</Text>
					</Section>

					<Button href={dashboardPlaylistsUrl} style={button}>
						Open playlists
					</Button>

					<Text style={footer}>
						You are receiving this transactional email because your organize run
						completed successfully.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

OrganizeCompleteEmail.PreviewProps = {
	dashboardPlaylistsUrl: "http://127.0.0.1:3003/playlists",
	recipientName: "Malek",
	playlistsCreated: 7,
	tracksOrganized: 143,
} satisfies OrganizeCompleteEmailProps;

export default OrganizeCompleteEmail;

const body = {
	backgroundColor: "#f5f7fb",
	color: "#111827",
	fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
	margin: "0",
	padding: "24px 0",
};

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #e5e7eb",
	borderRadius: "12px",
	margin: "0 auto",
	maxWidth: "560px",
	padding: "24px",
};

const heading = {
	fontSize: "24px",
	fontWeight: "700",
	lineHeight: "1.3",
	margin: "0 0 12px",
};

const text = {
	color: "#374151",
	fontSize: "14px",
	lineHeight: "1.6",
	margin: "0 0 16px",
};

const statsSection = {
	backgroundColor: "#f9fafb",
	border: "1px solid #e5e7eb",
	borderRadius: "10px",
	margin: "0 0 24px",
	padding: "16px",
};

const statLabel = {
	color: "#6b7280",
	fontSize: "12px",
	letterSpacing: "0.02em",
	margin: "0 0 4px",
	textTransform: "uppercase" as const,
};

const statValue = {
	color: "#111827",
	fontSize: "24px",
	fontWeight: "700",
	lineHeight: "1.2",
	margin: "0 0 10px",
};

const button = {
	backgroundColor: "#111827",
	borderRadius: "8px",
	color: "#ffffff",
	fontSize: "14px",
	fontWeight: "600",
	padding: "12px 18px",
	textDecoration: "none",
};

const footer = {
	color: "#6b7280",
	fontSize: "12px",
	lineHeight: "1.5",
	marginTop: "16px",
};
