"use client";

import type { ReactNode } from "react";
import type { AuthClientForUI } from "../../types/auth";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

type UserMenuProps = {
	authClient: AuthClientForUI;
	signInUrl?: string;
	signInLinkComponent?: React.ComponentType<{
		href: string;
		children: ReactNode;
	}>;
	onSignOutSuccess?: () => void;
};

export function UserMenu({
	authClient,
	signInUrl = "/login",
	signInLinkComponent: SignInLink,
	onSignOutSuccess,
}: UserMenuProps) {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		const signInButton = <Button variant="outline">Sign In</Button>;
		return SignInLink ? (
			<SignInLink href={signInUrl}>{signInButton}</SignInLink>
		) : (
			<a href={signInUrl}>{signInButton}</a>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">{session.user.name}</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>{session.user.email}</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: onSignOutSuccess,
								},
							});
						}}
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
