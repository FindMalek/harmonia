import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Text,
} from "@react-email/components";

export type WelcomeEmailProps = {
	dashboardUrl: string;
	recipientName?: string | null;
};

export function WelcomeEmail({
	dashboardUrl,
	recipientName,
}: WelcomeEmailProps) {
	const safeName = recipientName?.trim().length ? recipientName : "there";

	return (
		<Html>
			<Head />
			<Preview>Welcome to Harmonia</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>Welcome to Harmonia, {safeName}</Heading>
					<Text style={text}>
						You are all set. Connect your Spotify library and start organizing
						your music into smart playlists.
					</Text>
					<Button href={dashboardUrl} style={button}>
						Open dashboard
					</Button>
				</Container>
			</Body>
		</Html>
	);
}

WelcomeEmail.PreviewProps = {
	dashboardUrl: "http://127.0.0.1:3003",
	recipientName: "Malek",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;

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

const button = {
	backgroundColor: "#111827",
	borderRadius: "8px",
	color: "#ffffff",
	fontSize: "14px",
	fontWeight: "600",
	padding: "12px 18px",
	textDecoration: "none",
};
