import { AdminShell } from "@/components/app/admin-shell";
import { AdminCostsContent } from "@/components/app/admin-costs-content";

export default function CostsPage() {
	return (
		<AdminShell
			title="Costs"
			description="AI/API spend per pipeline run"
		>
			<AdminCostsContent />
		</AdminShell>
	);
}
