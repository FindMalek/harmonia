"use client";

import {
	Button,
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	Textarea,
} from "@harmonia/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { toastError } from "@/shared/api/error-handler";
import { orpc } from "@/shared/api/orpc";

const RATINGS = [1, 2, 3, 4, 5] as const;

const feedbackFormSchema = z.object({
	message: z.string().trim().min(1, "Please share some feedback."),
	rating: z.number().int().min(1).max(5).nullable(),
});

export default function FeedbackPage() {
	const searchParams = useSearchParams();
	const source: "email_feedback_3day" | "in_app" =
		searchParams.get("source") === "email_feedback_3day"
			? "email_feedback_3day"
			: "in_app";
	const campaignKey = searchParams.get("campaignKey") ?? undefined;

	const [submitted, setSubmitted] = useState(false);
	const submitFeedback = useMutation(orpc.feedback.submit.mutationOptions());

	const form = useForm({
		defaultValues: { message: "", rating: null as number | null },
		validators: { onSubmit: feedbackFormSchema },
		onSubmit: async ({ value }) => {
			try {
				await submitFeedback.mutateAsync({
					message: value.message,
					rating: value.rating ?? undefined,
					source,
					campaignKey,
				});
				setSubmitted(true);
				toast.success("Thanks for the feedback!");
			} catch (err) {
				toastError(
					err instanceof Error ? err.message : "Failed to submit feedback",
				);
			}
		},
	});

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

			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<FieldGroup>
					<form.Field
						name="message"
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name} className="text-xs">
										Your feedback
									</FieldLabel>
									<Textarea
										id={field.name}
										name={field.name}
										placeholder="What's on your mind?"
										rows={6}
										maxLength={2000}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					/>

					<form.Field
						name="rating"
						children={(field) => (
							<Field>
								<FieldLabel className="text-xs">Rating (optional)</FieldLabel>
								<div className="flex gap-2">
									{RATINGS.map((value) => (
										<Button
											key={value}
											type="button"
											size="icon"
											variant={
												field.state.value === value ? "default" : "outline"
											}
											className="size-9"
											onClick={() =>
												field.handleChange((current) =>
													current === value ? null : value,
												)
											}
										>
											{value}
										</Button>
									))}
								</div>
							</Field>
						)}
					/>

					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button
								type="submit"
								className="w-fit"
								disabled={isSubmitting}
								isLoading={isSubmitting}
							>
								{isSubmitting ? "Sending..." : "Send feedback"}
							</Button>
						)}
					</form.Subscribe>
				</FieldGroup>
			</form>
		</div>
	);
}
