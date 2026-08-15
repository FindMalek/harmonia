import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { buttonVariants, cn, HarmoniaBrandHeader, Icons } from "@harmonia/ui";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import { serverClient } from "@/shared/api/orpc-server";
import { getServerSession } from "@/shared/api/session.server";

const STEPS = ["Signed up", "Under review", "Approved"] as const;

function Stepper({ status }: { status: "pending" | "approved" }) {
	return (
		<div className="flex items-center">
			{STEPS.map((label, i) => {
				const done = status === "approved" || i === 0;
				const active = status === "pending" && i === 1;
				return (
					<Fragment key={label}>
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
									done
										? "border-primary bg-primary text-primary-foreground"
										: active
											? "border-primary text-primary"
											: "border-muted-foreground/30 text-muted-foreground",
								)}
							>
								{done ? <Icons.check className="size-3.5" /> : i + 1}
							</div>
							<span
								className={cn(
									"text-sm",
									done || active ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{label}
							</span>
						</div>
						{i < STEPS.length - 1 && (
							<div className="mx-3 h-px w-8 bg-border sm:w-12" />
						)}
					</Fragment>
				);
			})}
		</div>
	);
}

function WaitingShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<HarmoniaBrandHeader />
				{children}
				<div className="flex-1" />
			</div>
		</div>
	);
}

export default async function WaitingPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string; reason?: string }>;
}) {
	const session = await getServerSession();

	// Already approved — send them where they belong
	if (session?.user?.isApproved) {
		if (session.user.hasCompletedOnboarding) {
			redirect(DASHBOARD_ROUTES.overview.path);
		}
		redirect(DASHBOARD_ROUTES.onboarding.introduction.path);
	}

	// proxy.ts's middleware never runs on /waiting either — same #281 fallback as /login.
	if (session?.user && !session.user.isApproved) {
		const cookieStore = await cookies();
		if (cookieStore.has("harmonia_invite")) {
			redirect("/api/redeem-invite");
		}
	}

	const { token, reason } = await searchParams;

	if (token) {
		const result = await serverClient.waitlist.status({ token });

		if (result.status === "pending") {
			return (
				<WaitingShell>
					<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
						<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
							You're on
							<br />
							the waitlist.
						</h1>
						<p className="mt-6 text-base text-muted-foreground leading-relaxed">
							You're <strong>#{result.queuePosition}</strong> in line. We'll
							email you the moment your spot is ready.
						</p>
						<div className="mt-10">
							<Stepper status="pending" />
						</div>
					</div>
				</WaitingShell>
			);
		}

		if (result.status === "approved") {
			return (
				<WaitingShell>
					<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
						<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
							You're in.
						</h1>
						<p className="mt-6 text-base text-muted-foreground leading-relaxed">
							Check your inbox for the email with your sign-in link, or continue
							below.
						</p>
						<div className="mt-10">
							<Stepper status="approved" />
						</div>
						<div className="mt-10">
							<Link
								href={`/api/invite/${token}`}
								className={buttonVariants({ size: "lg" })}
							>
								Go to dashboard
							</Link>
						</div>
					</div>
				</WaitingShell>
			);
		}

		if (result.status === "rejected") {
			return (
				<WaitingShell>
					<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
						<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
							Not this time.
						</h1>
						<p className="mt-6 text-base text-muted-foreground leading-relaxed">
							This email isn't on the active waitlist. Contact us if you think
							that's a mistake.
						</p>
					</div>
				</WaitingShell>
			);
		}
		// status === null (not found) falls through to the generic message below.
	}

	return (
		<WaitingShell>
			<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
				<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
					You're on
					<br />
					the waitlist.
				</h1>
				<p className="mt-6 text-base text-muted-foreground leading-relaxed">
					{reason === "invalid_invite"
						? "That invite link has expired or was already used. We'll send a fresh one if you're still waiting on approval."
						: "We'll send you an email as soon as your spot is ready. No action needed on your end."}
				</p>
			</div>
		</WaitingShell>
	);
}
