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

export type MarketingFeatureUpdateEmailProps = {
	featureTitle: string;
	featureSummary: string;
	ctaUrl: string;
	preferencesUrl: string;
	unsubscribeUrl: string;
	recipientName?: string | null;
};

export function MarketingFeatureUpdateEmail({
	featureTitle,
	featureSummary,
	ctaUrl,
	preferencesUrl,
	unsubscribeUrl,
	recipientName,
}: MarketingFeatureUpdateEmailProps) {
	const safeName = recipientName?.trim().length ? recipientName : "there";

	return (
		<Html>
			<Head />
			<Preview>New in Harmonia: {featureTitle}</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>New in Harmonia, {safeName}</Heading>
					<Text style={text}>
						<strong>{featureTitle}</strong>
					</Text>
					<Text style={text}>{featureSummary}</Text>
					<Button href={ctaUrl} style={button}>
						Try it now
					</Button>
					<Text style={footer}>
						You are receiving this marketing email because you opted in to
						product updates. Manage{" "}
						<a href={preferencesUrl} style={link}>
							email preferences
						</a>{" "}
						or{" "}
						<a href={unsubscribeUrl} style={link}>
							unsubscribe
						</a>
						.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

MarketingFeatureUpdateEmail.PreviewProps = {
	featureTitle: "Smarter cluster titles",
	featureSummary:
		"Harmonia now creates clearer playlist names using your listening patterns.",
	ctaUrl: "http://127.0.0.1:3003/playlists",
	preferencesUrl: "http://127.0.0.1:3003/settings",
	unsubscribeUrl: "http://127.0.0.1:3002/api/unsubscribe/example",
	recipientName: "Malek",
} satisfies MarketingFeatureUpdateEmailProps;

export default MarketingFeatureUpdateEmail;

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

const footer = {
	color: "#6b7280",
	fontSize: "12px",
	lineHeight: "1.5",
	marginTop: "16px",
};

const link = {
	color: "#0f62fe",
};
