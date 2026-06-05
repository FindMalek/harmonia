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
	welcome: "transactional",
	login_alert: "security",
	feedback_3day: "feedback",
	marketing_feature_update: "product_update",
	subscription_activated: "billing",
	invoice: "billing",
	payment_failed: "billing",
	subscription_renewal_reminder: "billing",
	subscription_canceled: "billing",
};

export function getEmailTemplateCategory(
	templateKey: EmailTemplateKey,
): EmailTemplateCategory {
	return TEMPLATE_CATEGORIES[templateKey];
}
