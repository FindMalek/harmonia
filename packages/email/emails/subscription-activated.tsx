import {
	Body,
	Container,
	Heading,
	Img,
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
import { getEmailImageUrl } from "../utils";

export type SubscriptionActivatedEmailProps = {
	recipientName?: string | null;
	planName: string;
	billingCycleLabel: string;
	amount: string;
	nextBillingDate: string;
	dashboardUrl: string;
	manageSubscriptionUrl: string;
};

export function SubscriptionActivatedEmail({
	recipientName,
	planName = "Pro",
	billingCycleLabel = "monthly",
	amount = "$9/month",
	nextBillingDate,
	dashboardUrl = "http://127.0.0.1:3003",
	manageSubscriptionUrl = "http://127.0.0.1:3003/settings/billing",
}: SubscriptionActivatedEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const formattedNextBilling = nextBillingDate
		? format(new Date(nextBillingDate), "PPP")
		: null;

	return (
		<EmailThemeProvider
			preview={<Preview>Your Harmonia {planName} subscription is active</Preview>}
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
					<Img
						src={getEmailImageUrl("subscription-activated-hero.png")}
						width="560"
						height="280"
						alt=""
						className="mx-auto my-0 block w-full rounded-md object-cover"
						style={{ display: "block" }}
					/>
					<Heading
						className={`mt-[24px] mb-[8px] text-center font-normal font-serif text-[21px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						You&apos;re all set, {safeName}
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Your Harmonia {planName} subscription is now active. Time to make
						your music library sing.
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
							className={`m-0 mb-[8px] text-[14px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							<strong>Plan:</strong> {planName} ({billingCycleLabel})
						</Text>
						<Text
							className={`m-0 mb-[8px] text-[14px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							<strong>Amount:</strong> {amount}
						</Text>
						{formattedNextBilling ? (
							<Text
								className={`m-0 text-[14px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								<strong>Next billing date:</strong> {formattedNextBilling}
							</Text>
						) : null}
					</Section>

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={dashboardUrl}>Open dashboard</Button>
					</Section>

					<Footer
						settingsUrl={manageSubscriptionUrl}
						complianceText="You are receiving this transactional billing email because you have an active or recent Harmonia subscription."
					/>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

SubscriptionActivatedEmail.PreviewProps = {
	recipientName: "Malek",
	planName: "Pro",
	billingCycleLabel: "monthly",
	amount: "$9/month",
	nextBillingDate: new Date(
		Date.now() + 30 * 24 * 60 * 60 * 1000,
	).toISOString(),
	dashboardUrl: "http://127.0.0.1:3003",
	manageSubscriptionUrl: "http://127.0.0.1:3003/settings/billing",
} satisfies SubscriptionActivatedEmailProps;

export default SubscriptionActivatedEmail;
