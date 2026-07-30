import { format, isValid } from "date-fns";
import { Resend } from "resend";
import { z } from "zod";
import {
	Feedback3DayEmail,
	type Feedback3DayEmailProps,
} from "../emails/feedback-3day";
import { InvoiceEmail, type InvoiceEmailProps } from "../emails/invoice";
import {
	MarketingFeatureUpdateEmail,
	type MarketingFeatureUpdateEmailProps,
} from "../emails/marketing-feature-update";
import {
	OrganizeCompleteEmail,
	type OrganizeCompleteEmailProps,
} from "../emails/organize-complete";
import {
	WaitlistApprovedEmail,
	type WaitlistApprovedEmailProps,
} from "../emails/waitlist-approved";
import {
	WaitlistConfirmationEmail,
	type WaitlistConfirmationEmailProps,
} from "../emails/waitlist-confirmation";
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

type SendInvoiceInput = {
	config: SendEmailConfig;
	to: string;
	props: InvoiceEmailProps;
	idempotencyKey: string;
};

type SendWaitlistConfirmationInput = {
	config: SendEmailConfig;
	to: string;
	props: WaitlistConfirmationEmailProps;
	idempotencyKey: string;
};

type SendWaitlistApprovedInput = {
	config: SendEmailConfig;
	to: string;
	props: WaitlistApprovedEmailProps;
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

export async function sendWaitlistConfirmationEmail(
	input: SendWaitlistConfirmationInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(WaitlistConfirmationEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "You're on the Harmonia waitlist",
			html,
			tags: [{ name: "category", value: "waitlist_confirmation" }],
		},
		{ idempotencyKey: input.idempotencyKey },
	);

	if (error) {
		return { ok: false, error: error.message };
	}

	return { ok: true, emailId: data?.id ?? "" };
}

export async function sendWaitlistApprovedEmail(
	input: SendWaitlistApprovedInput,
): Promise<SendResult> {
	const config = resolveConfig(input.config);
	const resend = createResend(config);
	const html = await render(WaitlistApprovedEmail(input.props));

	const { data, error } = await resend.emails.send(
		{
			from: config.from,
			to: [input.to],
			replyTo: config.replyTo ? [config.replyTo] : undefined,
			subject: "You're in — welcome to Harmonia",
			html,
			tags: [{ name: "category", value: "waitlist_approved" }],
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
	const parsedInvoiceDate = input.props.invoiceDate
		? new Date(input.props.invoiceDate)
		: null;
	const formattedDate =
		parsedInvoiceDate && isValid(parsedInvoiceDate)
			? format(parsedInvoiceDate, "PPP")
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
