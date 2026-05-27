import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { format } from "date-fns";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

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
	settingsUrl = "http://127.0.0.1:3003/settings/notifications",
}: LoginAlertEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const loginAt = format(new Date(loginAtIso), "PPpp");

	return (
		<EmailThemeProvider preview={<Preview>New Harmonia login</Preview>}>
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
						New login detected
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Hi {safeName}, we noticed a new sign-in to your Harmonia account.
					</Text>

					<Section
						className={`mb-[20px] rounded-md p-[16px] ${themeClasses.highlight}`}
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
						}}
					>
						<Text
							className={`m-0 mb-[8px] text-[13px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							<strong>Time:</strong> {loginAt}
						</Text>
						{ipAddress ? (
							<Text
								className={`m-0 mb-[8px] text-[13px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								<strong>IP address:</strong> {ipAddress}
							</Text>
						) : null}
						{userAgent ? (
							<Text
								className={`m-0 text-[13px] ${themeClasses.mutedText}`}
								style={{ color: lightStyles.mutedText.color }}
							>
								<strong>Device:</strong> {userAgent}
							</Text>
						) : null}
					</Section>

					<Text
						className={`mb-[24px] text-center text-[13px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						If this was not you, review your account security settings
						immediately.
					</Text>

					<Section className="mt-[32px] mb-[40px] text-center">
						<Button href={settingsUrl}>Review notification settings</Button>
					</Section>

					<Footer complianceText="You are receiving this security alert because a new login was detected on your account." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

LoginAlertEmail.PreviewProps = {
	recipientName: "Malek",
	loginAtIso: new Date().toISOString(),
	ipAddress: "192.168.1.1",
	userAgent: "Chrome on macOS",
	settingsUrl: "http://127.0.0.1:3003/settings/notifications",
} satisfies LoginAlertEmailProps;

export default LoginAlertEmail;
