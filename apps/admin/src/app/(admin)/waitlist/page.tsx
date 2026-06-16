import { AdminShell } from "@/components/app/admin-shell";
import { AdminWaitlistContent } from "@/components/app/admin-waitlist-content";

export default function WaitlistPage() {
	return (
		<AdminShell title="Waitlist" description="Manage waitlist signup requests">
			<AdminWaitlistContent />
		</AdminShell>
	);
}
