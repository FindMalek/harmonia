"use client";

import {
	Button,
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
} from "@harmonia/ui";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/shared/api/auth-client";
import { orpc } from "@/shared/api/orpc";

const setupSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z
		.string()
		.trim()
		.pipe(z.email({ error: "Enter a valid email address." })),
	password: z.string().min(8, "Password must be at least 8 characters."),
});

export function AdminSetupForm() {
	const router = useRouter();

	const createAdmin = useMutation(orpc.admin.setup.create.mutationOptions());

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		validators: { onSubmit: setupSchema },
		onSubmit: async ({ value }) => {
			try {
				await createAdmin.mutateAsync(value);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Could not create admin account",
				);
				return;
			}

			const { error } = await authClient.signIn.email({
				email: value.email,
				password: value.password,
			});
			if (error) {
				toast.error(
					"Admin account created — sign in with your new credentials.",
				);
				router.push("/login");
				return;
			}

			router.push("/");
			router.refresh();
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
					name="name"
					children={(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name} className="text-xs">
									Name
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="text"
									autoComplete="name"
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
									placeholder="admin@harmonia.com"
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
									autoComplete="new-password"
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
							{isSubmitting ? "Creating…" : "Create admin account"}
						</Button>
					)}
				</form.Subscribe>
			</FieldGroup>
		</form>
	);
}
