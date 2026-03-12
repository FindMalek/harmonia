import { Icons } from "@harmonia/ui";

export function Header() {
	return (
		<div className="flex items-center gap-3">
			<Icons.logo className="h-4 w-4 text-foreground" />
			<span className="text-sm font-bold tracking-widest text-foreground">
				HARMONIA
			</span>
		</div>
	);
}
