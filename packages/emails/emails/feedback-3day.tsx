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

export type Feedback3DayEmailProps = {
	recipientName?: string | null;
	feedbackUrl: string;
	dashboardUrl: string;
};

export function Feedback3DayEmail({
	recipientName,
	feedbackUrl,
	dashboardUrl,
}: Feedback3DayEmailProps) {
	const safeName = recipientName?.trim().length ? recipientName : "there";

	return (
		<Html>
			<Head />
			<Preview>How is Harmonia working for you?</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>How is Harmonia going, {safeName}?</Heading>
					<Text style={text}>
						You have been using Harmonia for a few days. A quick feedback note
						from you helps us improve recommendations and playlist quality.
					</Text>
					<Button href={feedbackUrl} style={button}>
						Share feedback
					</Button>
					<Text style={text}>
						Or continue organizing your library in{" "}
						<a href={dashboardUrl} style={link}>
							the dashboard
						</a>
						.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

Feedback3DayEmail.PreviewProps = {
	recipientName: "Malek",
	feedbackUrl: "https://example.com/feedback",
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies Feedback3DayEmailProps;

export default Feedback3DayEmail;

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

const link = {
	color: "#0f62fe",
};
