"use client";

import type { ReactNode } from "react";

import { ModeToggle } from "./shared/mode-toggle";
import type { AuthClientForUI } from "../types/auth";
import { UserMenu } from "./shared/user-menu";

export type HeaderLink = {
	to: string;
	label: string;
};

type HeaderProps = {
	links?: readonly HeaderLink[];
	linkComponent: React.ComponentType<{ href: string; children: ReactNode }>;
	authClient?: AuthClientForUI;
	signInUrl?: string;
	signInLinkComponent?: React.ComponentType<{
		href: string;
		children: ReactNode;
	}>;
	onSignOutSuccess?: () => void;
};

export function Header({
	links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	],
	linkComponent: LinkComponent,
	authClient,
	signInUrl = "/login",
	signInLinkComponent,
	onSignOutSuccess,
}: HeaderProps) {
	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => (
						<LinkComponent key={to} href={to}>
							{label}
						</LinkComponent>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle variant="immediate" />
					{authClient && (
						<UserMenu
							authClient={authClient}
							signInUrl={signInUrl}
							signInLinkComponent={signInLinkComponent}
							onSignOutSuccess={onSignOutSuccess}
						/>
					)}
				</div>
			</div>
			<hr />
		</div>
	);
}
