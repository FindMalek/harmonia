"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Header } from "@harmonia/ui";
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

export default function AppHeader() {
	const router = useRouter();

	return (
		<Header
			links={[{ to: "/", label: "Dashboard" }]}
			linkComponent={NavLink}
			authClient={authClient}
			signInUrl="/login"
			signInLinkComponent={SignInLink}
			onSignOutSuccess={() => router.push("/")}
		/>
	);
}
