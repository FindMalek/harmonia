"use client";

import { Button, cn, Textarea } from "@harmonia/ui";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function FeedbackPage() {
	const searchParams = useSearchParams();
	const source =
		searchParams.get("source") === "email_feedback_3day"
			? "email_feedback_3day"
			: "in_app";
	const campaignKey = searchParams.get("campaignKey") ?? undefined;

	const [message, setMessage] = useState("");
	const [rating, setRating] = useState<number | undefined>(undefined);
	const [submitted, setSubmitted] = useState(false);

	const submitFeedback = useMutation(
		orpc.feedback.submit.mutationOptions({
			onSuccess: () => {
				setSubmitted(true);
				toast.success("Thanks for the feedback!");
			},
			onError: (error) => {
				toastError(error.message ?? "Failed to submit feedback");
			},
		}),
	);

	if (submitted) {
		return (
			<div className="flex flex-col gap-6">
				<PageHeader
					title="Feedback"
					description="Thanks for letting us know."
				/>
				<p className="text-muted-foreground text-sm">
					We read every submission — appreciate you taking the time.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Feedback"
				description="Tell us what's working and what we can improve."
			/>

			<div className="flex flex-col gap-4">
				<Textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="What's on your mind?"
					rows={6}
					maxLength={2000}
				/>

				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-sm">
						Rating (optional)
					</span>
					<div className="flex gap-2">
						{RATINGS.map((value) => (
							<button
								key={value}
								type="button"
								onClick={() =>
									setRating((current) =>
										current === value ? undefined : value,
									)
								}
								className={cn(
									"flex size-9 items-center justify-center rounded-none border text-sm",
									rating === value
										? "border-primary bg-primary text-primary-foreground"
										: "border-input hover:bg-accent",
								)}
							>
								{value}
							</button>
						))}
					</div>
				</div>

				<Button
					className="w-fit"
					disabled={message.trim().length === 0 || submitFeedback.isPending}
					isLoading={submitFeedback.isPending}
					onClick={() =>
						submitFeedback.mutate({
							message: message.trim(),
							rating,
							source,
							campaignKey,
						})
					}
				>
					{submitFeedback.isPending ? "Sending..." : "Send feedback"}
				</Button>
			</div>
		</div>
	);
}
