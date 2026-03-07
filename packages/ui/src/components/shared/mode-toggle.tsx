"use client";

import { useTheme } from "next-themes";

import { Icons } from "./icons";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

const THEME_CYCLE: Theme[] = ["light", "dark"];

type ModeToggleProps = {
	/**
	 * - "immediate": Click cycles light ↔ dark immediately (no dropdown)
	 * - "dropdown": Click opens dropdown with Light, Dark, System options
	 */
	variant?: "immediate" | "dropdown";
};

export function ModeToggle({ variant = "dropdown" }: ModeToggleProps) {
	const { theme, setTheme, resolvedTheme } = useTheme();

	const handleImmediateClick = () => {
		const current = (resolvedTheme ?? theme ?? "light") as Theme;
		const next =
			THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
		setTheme(next as Theme);
	};

	const iconButton = (
		<Button
			variant="outline"
			size="icon"
			onClick={variant === "immediate" ? handleImmediateClick : undefined}
			type={variant === "immediate" ? "button" : undefined}
		>
			<Icons.sun className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
			<Icons.moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);

	if (variant === "immediate") {
		return iconButton;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{iconButton}</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
