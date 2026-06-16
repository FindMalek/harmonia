"use client";

import type { WaitlistAdminItem } from "@harmonia/common/schemas";
import {
	Badge,
	Button,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@harmonia/ui";
import { format } from "date-fns";

function StatusBadge({ status }: { status: WaitlistAdminItem["status"] }) {
	const variants = {
		pending: "secondary",
		approved: "default",
		rejected: "destructive",
	} as const;
	return <Badge variant={variants[status]}>{status}</Badge>;
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="text-right text-sm">{children}</span>
		</div>
	);
}

type AdminWaitlistDetailSheetProps = {
	item: WaitlistAdminItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApprove: (id: number) => void;
	onReject: (id: number) => void;
	isActionLoading: boolean;
};

export function AdminWaitlistDetailSheet({
	item,
	open,
	onOpenChange,
	onApprove,
	onReject,
	isActionLoading,
}: AdminWaitlistDetailSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Waitlist Entry</SheetTitle>
					<SheetDescription>{item?.email}</SheetDescription>
				</SheetHeader>

				{item && (
					<div className="mt-6 space-y-0">
						<Row label="Email">{item.email}</Row>
						<Row label="Status">
							<StatusBadge status={item.status} />
						</Row>
						<Row label="Note">{item.note ?? "—"}</Row>
						<Row label="Signed up">
							{format(item.createdAt, "d MMM yyyy, HH:mm")}
						</Row>
						<Row label="Confirmation sent">
							{item.confirmationEmailSentAt
								? format(item.confirmationEmailSentAt, "d MMM yyyy, HH:mm")
								: "—"}
						</Row>
						<Row label="Approved at">
							{item.approvedAt
								? format(item.approvedAt, "d MMM yyyy, HH:mm")
								: "—"}
						</Row>
						<Row label="Approval email sent">
							{item.approvalEmailSentAt
								? format(item.approvalEmailSentAt, "d MMM yyyy, HH:mm")
								: "—"}
						</Row>
					</div>
				)}

				{item && item.status !== "approved" && (
					<div className="mt-6 flex gap-2">
						<Button
							size="sm"
							onClick={() => onApprove(item.id)}
							disabled={isActionLoading}
						>
							Approve
						</Button>
						{item.status !== "rejected" && (
							<Button
								size="sm"
								variant="destructive"
								onClick={() => onReject(item.id)}
								disabled={isActionLoading}
							>
								Reject
							</Button>
						)}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
