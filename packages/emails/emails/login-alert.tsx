import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";

export type LoginAlertEmailProps = {
	recipientName?: string | null;
	loginAtIso: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	settingsUrl: string;
};

export function LoginAlertEmail({
	recipientName,
	loginAtIso,
	ipAddress,
	userAgent,
	settingsUrl,
}: LoginAlertEmailProps) {
	const safeName = recipientName?.trim().length ? recipientName : "there";
	const loginAt = new Date(loginAtIso).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});

	return (
		<Html>
			<Head />
			<Preview>New Harmonia login</Preview>
			<Body style={body}>
				<Container style={container}>
					<Heading style={heading}>New login detected, {safeName}</Heading>
					<Text style={text}>
						A new login was detected on your Harmonia account.
					</Text>
					<Section style={details}>
						<Text style={detailLine}>Time: {loginAt}</Text>
						{ipAddress ? <Text style={detailLine}>IP: {ipAddress}</Text> : null}
						{userAgent ? (
							<Text style={detailLine}>Device: {userAgent}</Text>
						) : null}
					</Section>
					<Text style={text}>
						If this was not you, review your account immediately in{" "}
						<a href={settingsUrl} style={link}>
							settings
						</a>
						.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

LoginAlertEmail.PreviewProps = {
	recipientName: "Malek",
	loginAtIso: new Date().toISOString(),
	ipAddress: "203.0.113.4",
	userAgent: "Mozilla/5.0",
	settingsUrl: "http://127.0.0.1:3003/settings",
} satisfies LoginAlertEmailProps;

export default LoginAlertEmail;

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
	fontSize: "22px",
	fontWeight: "700",
	lineHeight: "1.3",
	margin: "0 0 12px",
};

const text = {
	color: "#374151",
	fontSize: "14px",
	lineHeight: "1.6",
	margin: "0 0 12px",
};

const details = {
	backgroundColor: "#f9fafb",
	border: "1px solid #e5e7eb",
	borderRadius: "8px",
	marginBottom: "12px",
	padding: "12px",
};

const detailLine = {
	color: "#111827",
	fontSize: "13px",
	margin: "0 0 4px",
};

const link = {
	color: "#0f62fe",
};
