import { z } from "zod";

export const emailTemplateKeyEnum = z.enum([
	"organize_complete",
	"welcome",
	"login_alert",
	"feedback_3day",
	"marketing_feature_update",
	"subscription_activated",
	"invoice",
	"payment_failed",
	"subscription_renewal_reminder",
	"subscription_canceled",
]);
export type EmailTemplateKey = z.infer<typeof emailTemplateKeyEnum>;

export const emailSendStatusEnum = z.enum([
	"queued",
	"sent",
	"failed",
	"skipped",
]);
export type EmailSendStatus = z.infer<typeof emailSendStatusEnum>;
