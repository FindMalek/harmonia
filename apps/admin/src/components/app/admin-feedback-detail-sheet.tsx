"use client";

import type { FeedbackAdminItem } from "@harmonia/common/schemas";
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
import { toast } from "sonner";

const SOURCE_LABELS: Record<FeedbackAdminItem["source"], string> = {
	email_feedback_3day: "3-day email",
	in_app: "In-app",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
			{children}
		</p>
	);
}

type AdminFeedbackDetailSheetProps = {
	item: FeedbackAdminItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function AdminFeedbackDetailSheet({
	item,
	open,
	onOpenChange,
}: AdminFeedbackDetailSheetProps) {
	async function copyEmail() {
		if (!item?.userEmail) return;
		await navigator.clipboard.writeText(item.userEmail);
		toast.success("Email copied");
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[420px]">
				<SheetHeader className="border-b px-5 py-4">
					<SheetTitle>Feedback</SheetTitle>
					<SheetDescription className="truncate font-mono text-xs">
						{item?.userEmail ?? "Unknown user"}
					</SheetDescription>
				</SheetHeader>

				{item ? (
					<>
						<ScrollArea className="flex-1">
							<div className="space-y-5 px-5 py-4">
								<div className="flex items-center gap-2">
									{item.rating != null && (
										<Badge variant="secondary">{item.rating} / 5</Badge>
									)}
									<Badge variant="outline">{SOURCE_LABELS[item.source]}</Badge>
								</div>

								<Separator />

								<div>
									<SectionHeading>Message</SectionHeading>
									<p className="whitespace-pre-wrap text-sm">{item.message}</p>
								</div>

								<Separator />

								<div>
									<SectionHeading>Submitted</SectionHeading>
									<p className="text-xs">
										{format(new Date(item.createdAt), "d MMM yyyy, HH:mm")}
									</p>
									{item.campaignKey && (
										<p className="mt-1 text-muted-foreground text-xs">
											Campaign: {item.campaignKey}
										</p>
									)}
								</div>
							</div>
						</ScrollArea>

						<SheetFooter className="border-t px-5 py-4">
							<div className="flex w-full gap-2">
								<Button
									size="sm"
									variant="outline"
									className="flex-1"
									disabled={!item.userEmail}
									onClick={() => void copyEmail()}
								>
									<Icons.copy />
									Copy email
								</Button>
								<Button
									size="sm"
									className="flex-1"
									disabled={!item.userEmail}
									asChild={!!item.userEmail}
								>
									{item.userEmail ? (
										<a href={`mailto:${item.userEmail}`}>
											<Icons.messageCircle />
											Reply by email
										</a>
									) : (
										<span>
											<Icons.messageCircle />
											Reply by email
										</span>
									)}
								</Button>
							</div>
						</SheetFooter>
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
