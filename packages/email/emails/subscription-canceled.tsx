import {
	Body,
	Container,
	Heading,
	Img,
	Link,
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

export type SubscriptionCanceledEmailProps = {
	recipientName?: string | null;
	planName: string;
	canceledAt: string;
	accessUntil: string;
	resubscribeUrl: string;
	dashboardUrl: string;
};

export function SubscriptionCanceledEmail({
	recipientName,
	planName = "Pro",
	canceledAt,
	accessUntil,
	resubscribeUrl = "http://127.0.0.1:3003/settings/billing",
	dashboardUrl = "http://127.0.0.1:3003",
}: SubscriptionCanceledEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const formattedCanceledAt = canceledAt
		? format(new Date(canceledAt), "PPP")
		: null;
	const formattedAccessUntil = accessUntil
		? format(new Date(accessUntil), "PPP")
		: null;

	return (
		<EmailThemeProvider
			preview={<Preview>Your Harmonia subscription has been canceled</Preview>}
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
						src={getEmailImageUrl("subscription-canceled-hero.png")}
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
						Sorry to see you go, {safeName}
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Your Harmonia {planName} subscription has been canceled. You will
						retain full access until the end of your billing period.
					</Text>

					<Section
						className={`mb-[20px] rounded-md p-[16px] ${themeClasses.highlight}`}
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
						}}
					>
						{formattedCanceledAt ? (
							<Text
								className={`m-0 mb-[8px] text-[13px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								<strong>Canceled on:</strong> {formattedCanceledAt}
							</Text>
						) : null}
						{formattedAccessUntil ? (
							<Text
								className={`m-0 text-[13px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								<strong>Access until:</strong> {formattedAccessUntil}
							</Text>
						) : null}
					</Section>

					<Section className="mt-[40px] mb-[16px] text-center">
						<Button href={resubscribeUrl}>Resubscribe</Button>
					</Section>

					<Text
						className={`text-center text-[12px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Or{" "}
						<Link
							href={dashboardUrl}
							style={{ color: lightStyles.mutedText.color }}
							className={themeClasses.mutedLink}
						>
							open your dashboard
						</Link>
					</Text>

					<Footer complianceText="You are receiving this transactional billing email because you have an active or recent Harmonia subscription." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

SubscriptionCanceledEmail.PreviewProps = {
	recipientName: "Malek",
	planName: "Pro",
	canceledAt: new Date().toISOString(),
	accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
	resubscribeUrl: "http://127.0.0.1:3003/settings/billing",
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies SubscriptionCanceledEmailProps;

export default SubscriptionCanceledEmail;
