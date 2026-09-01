import { AdminCostsContent } from "@/components/app/admin-costs-content";
import { AdminShell } from "@/components/app/admin-shell";

export default function CostsPage() {
	return (
		<AdminShell title="Costs" description="AI/API spend per pipeline run">
			<AdminCostsContent />
		</AdminShell>
	);
}
