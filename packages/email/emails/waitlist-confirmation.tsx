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

export type WaitlistConfirmationEmailProps = {
	waitingUrl: string;
};

export function WaitlistConfirmationEmail({
	waitingUrl = "http://127.0.0.1:3003/waiting",
}: WaitlistConfirmationEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider
			preview={<Preview>You're on the Harmonia waitlist</Preview>}
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
						You're on the list
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Thanks for your interest in Harmonia. We review signups in small
						batches and will email you the moment you're approved.
					</Text>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						As a thank-you for joining early, you'll get your{" "}
						<strong>first 3 months free</strong> once you're approved.
					</Text>

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={waitingUrl}>Check your status</Button>
					</Section>

					<Footer complianceText="You are receiving this email because you joined the Harmonia waitlist." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

WaitlistConfirmationEmail.PreviewProps = {
	waitingUrl:
		"http://127.0.0.1:3003/waiting?token=eyJlbWFpbCI6InlvdUBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OTk5fQ.example",
} satisfies WaitlistConfirmationEmailProps;

export default WaitlistConfirmationEmail;
