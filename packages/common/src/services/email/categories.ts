import type { EmailTemplateKey } from "../../schemas";

export type EmailTemplateCategory =
	| "transactional"
	| "security"
	| "feedback"
	| "product_update"
	| "marketing"
	| "billing";

const TEMPLATE_CATEGORIES: Record<EmailTemplateKey, EmailTemplateCategory> = {
	organize_complete: "transactional",
	organize_weekly_digest: "transactional",
	welcome: "transactional",
	feedback_3day: "feedback",
	marketing_feature_update: "product_update",
	invoice: "billing",
	waitlist_confirmation: "transactional",
	waitlist_approved: "transactional",
};

export function getEmailTemplateCategory(
	templateKey: EmailTemplateKey,
): EmailTemplateCategory {
	return TEMPLATE_CATEGORIES[templateKey];
}
