import { z } from "zod";

export const emailTemplateKeyEnum = z.enum([
	"organize_complete",
	"organize_weekly_digest",
	"welcome",
	"feedback_3day",
	"marketing_feature_update",
	"invoice",
	"waitlist_confirmation",
	"waitlist_approved",
]);
export type EmailTemplateKey = z.infer<typeof emailTemplateKeyEnum>;

export const emailSendStatusEnum = z.enum([
	"queued",
	"sent",
	"failed",
	"skipped",
]);
export type EmailSendStatus = z.infer<typeof emailSendStatusEnum>;
