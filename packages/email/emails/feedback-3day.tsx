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

export type Feedback3DayEmailProps = {
	recipientName?: string | null;
	feedbackUrl: string;
	dashboardUrl: string;
};

export function Feedback3DayEmail({
	recipientName,
	feedbackUrl = "http://127.0.0.1:3003/settings/notifications",
	dashboardUrl = "http://127.0.0.1:3003",
}: Feedback3DayEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";

	return (
		<EmailThemeProvider
			preview={<Preview>How is Harmonia working for you?</Preview>}
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
						How is Harmonia working for you?
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Hi {safeName}, you have been using Harmonia for a few days. We would
						love to hear what is working and what we can improve.
					</Text>

					<Section className="mt-[40px] mb-[16px] text-center">
						<Button href={feedbackUrl}>Share feedback</Button>
					</Section>

					<Text
						className={`text-center text-[12px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Or{" "}
						<a
							href={dashboardUrl}
							style={{ color: lightStyles.button.color }}
							className={themeClasses.link}
						>
							open your dashboard
						</a>
					</Text>

					<Footer
						settingsUrl={feedbackUrl}
						complianceText="You are receiving this email based on your Harmonia notification preferences."
					/>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

Feedback3DayEmail.PreviewProps = {
	recipientName: "Malek",
	feedbackUrl: "http://127.0.0.1:3003/settings/notifications",
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies Feedback3DayEmailProps;

export default Feedback3DayEmail;
