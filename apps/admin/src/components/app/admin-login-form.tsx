"use client";

import {
	Button,
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
} from "@sonaraem/ui";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/shared/api/auth-client";

const loginSchema = z.object({
	email: z.string().email("Enter a valid email address."),
	password: z.string().min(1, "Password is required."),
});

export function AdminLoginForm() {
	const router = useRouter();

	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onSubmit: loginSchema },
		onSubmit: async ({ value }) => {
			try {
				const { error } = await authClient.signIn.email(value);

				if (error) {
					toast.error(error.message ?? "Invalid credentials");
					return;
				}

				const session = await authClient.getSession();
				const role = session.data?.user?.role;
				if (role !== "admin") {
					await authClient.signOut();
					toast.error("You do not have permission to access this area.");
					return;
				}

				router.push("/");
				router.refresh();
			} catch {
				toast.error("Unable to sign in. Please try again.");
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup>
				<form.Field
					name="email"
					children={(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name} className="text-xs">
									Email
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									placeholder="admin@sonaraem.com"
									autoComplete="email"
									className="h-8"
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
					name="password"
					children={(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name} className="text-xs">
									Password
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="current-password"
									className="h-8"
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

				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting}
							isLoading={isSubmitting}
						>
							{isSubmitting ? "Signing in…" : "Sign in"}
						</Button>
					)}
				</form.Subscribe>
			</FieldGroup>
		</form>
	);
}
