"use client";

import { Button, Input, Label } from "@harmonia/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/shared/api/auth-client";

export function AdminLoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isPending, setIsPending] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsPending(true);

		const { error } = await authClient.signIn.email({ email, password });

		if (error) {
			toast.error(error.message ?? "Invalid credentials");
			setIsPending(false);
			return;
		}

		router.push("/");
		router.refresh();
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input
					id="email"
					type="email"
					placeholder="admin@harmonia.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					autoComplete="email"
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					autoComplete="current-password"
				/>
			</div>
			<Button type="submit" className="w-full" disabled={isPending}>
				{isPending ? "Signing in…" : "Sign in"}
			</Button>
		</form>
	);
}
