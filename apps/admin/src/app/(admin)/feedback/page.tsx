import { AdminFeedbackContent } from "@/components/app/admin-feedback-content";
import { AdminShell } from "@/components/app/admin-shell";

export default function FeedbackPage() {
	return (
		<AdminShell
			title="Feedback"
			description="Feedback submitted by users through the dashboard"
		>
			<AdminFeedbackContent />
		</AdminShell>
	);
}
