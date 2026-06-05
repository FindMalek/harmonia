import { format } from "date-fns";
import { Resend } from "resend";
import { z } from "zod";
import {
	Feedback3DayEmail,
	type Feedback3DayEmailProps,
} from "../emails/feedback-3day";
import {
	InvoiceEmail,
	type InvoiceEmailProps,
} from "../emails/invoice";
import {
	LoginAlertEmail,
	type LoginAlertEmailProps,
} from "../emails/login-alert";
import {
	MarketingFeatureUpdateEmail,
	type MarketingFeatureUpdateEmailProps,
} from "../emails/marketing-feature-update";
import {
	OrganizeCompleteEmail,
	type OrganizeCompleteEmailProps,
} from "../emails/organize-complete";
import {
	PaymentFailedEmail,
	type PaymentFailedEmailProps,
} from "../emails/payment-failed";
import {
	SubscriptionActivatedEmail,
	type SubscriptionActivatedEmailProps,
} from "../emails/subscription-activated";
import {
	SubscriptionCanceledEmail,
	type SubscriptionCanceledEmailProps,
} from "../emails/subscription-canceled";
import {
	SubscriptionRenewalReminderEmail,
	type SubscriptionRenewalReminderEmailProps,
} from "../emails/subscription-renewal-reminder";
import { WelcomeEmail, type WelcomeEmailProps } from "../emails/welcome";
import { render } from "../render";

const sendEmailConfigSchema = z.object({
	apiKey: z.string().min(1),
	from: z.string().min(1),
	replyTo: z.string().min(1).optional(),
});

type SendEmailConfig = z.infer<typeof sendEmailConfigSchema>;

type SendOrganizeCompleteInput = {
	config: SendEmailConfig;
	to: string;
	props: OrganizeCompleteEmailProps;
	idempotencyKey: string;
};

type SendWelcomeInput = {
	config: SendEmailConfig;
	to: string;
	props: WelcomeEmailProps;
	idempotencyKey: string;
};

type SendLoginAlertInput = {
	config: SendEmailConfig;
	to: string;
	props: LoginAlertEmailProps;
	idempotencyKey: string;
};

type SendFeedbackInput = {
	config: SendEmailConfig;
	to: string;
	props: Feedback3DayEmailProps;
	idempotencyKey: string;
};

type SendMarketingInput = {
	config: SendEmailConfig;
	to: string;
	props: MarketingFeatureUpdateEmailProps;
	idempotencyKey: string;
	listUnsubscribeUrl?: string;
};

type SendSubscriptionActivatedInput = {
	config: SendEmailConfig;
	to: string;
	props: SubscriptionActivatedEmailProps;
	idempotencyKey: string;
};

type SendInvoiceInput = {
	config: SendEmailConfig;
	to: string;
	props: InvoiceEmailProps;
	idempotencyKey: string;
};

type SendPaymentFailedInput = {
	config: SendEmailConfig;
	to: string;
	props: PaymentFailedEmailProps;
	idempotencyKey: string;
};

type SendSubscriptionRenewalReminderInput = {
	config: SendEmailConfig;
	to: string;
	props: SubscriptionRenewalReminderEmailProps;
	idempotencyKey: string;
};

type SendSubscriptionCanceledInput = {
	config: SendEmailConfig;
	to: string;
	props: SubscriptionCanceledEmailProps;
	idempotencyKey: string;
};

type SendResult = { ok: true; emailId: string } | { ok: false; error: string };

function resolveConfig(config: SendEmailConfig): SendEmailConfig {
	return sendEmailConfigSchema.parse(config);
}

function createResend(config: SendEmailConfig) {
	return new Resend(config.apiKey);
}

export async function sendOrganizeCompleteEmail(
	input: SendOrganizeCompleteInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(OrganizeCompleteEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "Your playlists are ready",
			html,
			tags: [{ name: "category", value: "organize_complete" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendWelcomeEmail(
	input: SendWelcomeInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(WelcomeEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "Welcome to Harmonia",
			html,
			tags: [{ name: "category", value: "welcome" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendLoginAlertEmail(
	input: SendLoginAlertInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(LoginAlertEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "New Harmonia login",
			html,
			tags: [{ name: "category", value: "login_alert" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendFeedback3DayEmail(
	input: SendFeedbackInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(Feedback3DayEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "How is Harmonia working for you?",
			html,
			tags: [{ name: "category", value: "feedback_3day" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendMarketingFeatureUpdateEmail(
	input: SendMarketingInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(MarketingFeatureUpdateEmail(input.props));

	const headers =
		input.listUnsubscribeUrl === undefined
			? undefined
			: {
					"List-Unsubscribe": `<${input.listUnsubscribeUrl}>`,
					"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
				};

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: `New in Harmonia: ${input.props.featureTitle}`,
			html,
			headers,
			tags: [{ name: "category", value: "marketing_feature_update" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendSubscriptionActivatedEmail(
	input: SendSubscriptionActivatedInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(SubscriptionActivatedEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "Your Harmonia subscription is active",
			html,
			tags: [{ name: "category", value: "billing" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendInvoiceEmail(
	input: SendInvoiceInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(InvoiceEmail(input.props));
	const formattedDate = input.props.invoiceDate
		? format(new Date(input.props.invoiceDate), "PPP")
		: input.props.billingPeriod;

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: `Your Harmonia receipt — ${formattedDate}`,
			html,
			tags: [{ name: "category", value: "billing" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendPaymentFailedEmail(
	input: SendPaymentFailedInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(PaymentFailedEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "Action required: payment failed",
			html,
			tags: [{ name: "category", value: "billing" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendSubscriptionRenewalReminderEmail(
	input: SendSubscriptionRenewalReminderInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(SubscriptionRenewalReminderEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "Your Harmonia subscription renews soon",
			html,
			tags: [{ name: "category", value: "billing" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendSubscriptionCanceledEmail(
	input: SendSubscriptionCanceledInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(SubscriptionCanceledEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "Your Harmonia subscription has been canceled",
			html,
			tags: [{ name: "category", value: "billing" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}
