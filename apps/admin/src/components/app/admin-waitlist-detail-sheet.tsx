"use client";

import type { WaitlistAdminItem } from "@harmonia/common/schemas";
import {
	Badge,
	Button,
	Icons,
	ScrollArea,
	Separator,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@harmonia/ui";
import { format } from "date-fns";

const STATUS_VARIANTS = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
} as const;

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-[110px_1fr] items-baseline gap-x-3 py-1.5">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="text-xs">{children}</span>
		</div>
	);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
			{children}
		</p>
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
			<SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[400px]">
				<SheetHeader className="border-b px-5 py-4">
					<SheetTitle>Waitlist entry</SheetTitle>
					<SheetDescription className="truncate font-mono text-xs">
						{item?.email ?? "—"}
					</SheetDescription>
				</SheetHeader>

				{item ? (
					<>
						<ScrollArea className="flex-1">
							<div className="space-y-5 px-5 py-4">
								{/* Status */}
								<div>
									<SectionHeading>Status</SectionHeading>
									<Badge variant={STATUS_VARIANTS[item.status]}>
										{item.status}
									</Badge>
								</div>

								<Separator />

								{/* Contact */}
								<div>
									<SectionHeading>Contact</SectionHeading>
									<DetailRow label="Email">{item.email}</DetailRow>
									<DetailRow label="Note">
										{item.note ?? (
											<span className="text-muted-foreground">—</span>
										)}
									</DetailRow>
								</div>

								<Separator />

								{/* Timeline */}
								<div>
									<SectionHeading>Timeline</SectionHeading>
									<DetailRow label="Signed up">
										{format(new Date(item.createdAt), "d MMM yyyy, HH:mm")}
									</DetailRow>
									<DetailRow label="Confirmation">
										{item.confirmationEmailSentAt ? (
											format(
												new Date(item.confirmationEmailSentAt),
												"d MMM yyyy, HH:mm",
											)
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</DetailRow>
									<DetailRow label="Approved at">
										{item.approvedAt ? (
											format(new Date(item.approvedAt), "d MMM yyyy, HH:mm")
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</DetailRow>
									<DetailRow label="Approval email">
										{item.approvalEmailSentAt ? (
											format(
												new Date(item.approvalEmailSentAt),
												"d MMM yyyy, HH:mm",
											)
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</DetailRow>
								</div>

								<Separator />

								{/* Identity check — the Spotify account isn't required to share
								    the waitlist email, so surface who actually claimed the invite. */}
								<div>
									<SectionHeading>Redeemed by</SectionHeading>
									<DetailRow label="Spotify account">
										{item.redeemedByEmail ?? (
											<span className="text-muted-foreground">
												Not redeemed yet
											</span>
										)}
									</DetailRow>
									<DetailRow label="Redeemed at">
										{item.inviteRedeemedAt ? (
											format(
												new Date(item.inviteRedeemedAt),
												"d MMM yyyy, HH:mm",
											)
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</DetailRow>
								</div>
							</div>
						</ScrollArea>

						{item.status !== "approved" && (
							<SheetFooter className="border-t px-5 py-4">
								<div className="flex w-full gap-2">
									<Button
										size="sm"
										onClick={() => onApprove(item.id)}
										disabled={isActionLoading}
										isLoading={isActionLoading}
										className="flex-1"
									>
										<Icons.circleCheck />
										Approve
									</Button>
									{item.status !== "rejected" && (
										<Button
											size="sm"
											variant="destructive"
											onClick={() => onReject(item.id)}
											disabled={isActionLoading}
											isLoading={isActionLoading}
											className="flex-1"
										>
											<Icons.x />
											Reject
										</Button>
									)}
								</div>
							</SheetFooter>
						)}
					</>
				) : (
					<div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
						Select an entry to view details
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
