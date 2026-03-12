import Link from "next/link";
import { buttonVariants } from "@harmonia/ui";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { cn } from "@/lib/utils";
import type { Route } from "next";

export default function WelcomePage() {
	return (
		<div className="flex flex-col items-start gap-8">
			<div className="space-y-4">
				<h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
					Welcome to Harmonia
				</h1>
				<p className="max-w-md text-lg text-muted-foreground">
					Harmonia organizes your Spotify library automatically using AI.
				</p>
			</div>

			<Link
				href={DASHBOARD_ROUTES.onboarding.introduction.path as Route}
				className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
			>
				Continue
			</Link>
		</div>
	);
}
