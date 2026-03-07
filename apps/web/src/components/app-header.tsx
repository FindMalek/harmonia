"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Header } from "@harmonia/ui";
import { env } from "@harmonia/env/web";
import { authClient } from "@/lib/auth-client";

function NavLink({
	href,
	children,
}: { href: string; children: React.ReactNode }) {
	return (
		<Link href={href as Parameters<typeof Link>[0]["href"]}>{children}</Link>
	);
}

function SignInLink({
	href,
	children,
}: { href: string; children: React.ReactNode }) {
	return (
		<Link href={href as Parameters<typeof Link>[0]["href"]}>{children}</Link>
	);
}

const dashboardUrl =
	env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ?? "http://localhost:3003";

export default function AppHeader() {
	const router = useRouter();

	return (
		<Header
			links={[
				{ to: "/", label: "Home" },
				{ to: dashboardUrl, label: "Dashboard" },
			]}
			linkComponent={NavLink}
			authClient={authClient}
			signInUrl={`${dashboardUrl}/login`}
			signInLinkComponent={SignInLink}
			onSignOutSuccess={() => router.push("/")}
		/>
	);
}
