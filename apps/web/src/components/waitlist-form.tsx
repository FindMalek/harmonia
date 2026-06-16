"use client";

import { Button, Input, Label } from "@harmonia/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export function WaitlistForm() {
	const [email, setEmail] = useState("");
	const [website, setWebsite] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const signup = useMutation(
		orpc.waitlist.signup.mutationOptions({
			onSuccess: () => setSubmitted(true),
			onError: () => {
				toast.error("Could not join the waitlist. Please try again.");
			},
		}),
	);

	if (submitted) {
		return (
			<p className="text-foreground text-sm">
				You're on the list — check your inbox for confirmation.
			</p>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				signup.mutate({ email, website });
			}}
			className="flex flex-col gap-4 sm:flex-row sm:items-end"
		>
			<div className="flex flex-1 flex-col gap-2">
				<Label htmlFor="email">Email address</Label>
				<Input
					id="email"
					type="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="you@example.com"
				/>
			</div>

			{/* Honeypot field: hidden from real users, only bots fill it in. */}
			<div className="absolute h-0 w-0 overflow-hidden opacity-0">
				<Label htmlFor="website">Website</Label>
				<Input
					id="website"
					name="website"
					type="text"
					tabIndex={-1}
					autoComplete="off"
					value={website}
					onChange={(e) => setWebsite(e.target.value)}
					aria-hidden="true"
				/>
			</div>

			<Button
				type="submit"
				size="xl"
				className="uppercase"
				isLoading={signup.isPending}
			>
				Join Waitlist
			</Button>
		</form>
	);
}
