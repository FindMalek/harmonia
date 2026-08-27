import { Icons } from "../components/shared/icons";
import { cn } from "../lib/utils";

export const brandTokens = {
	name: "SONARAEM",
	tagline: "Your music, organized.",
} as const;

export function SonaraemBrandHeader({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			<Icons.logo className="h-4 w-4 text-foreground" />
			<span className="font-bold text-foreground text-sm tracking-widest">
				{brandTokens.name}
			</span>
		</div>
	);
}
