"use client";

import { cn, Icons } from "@harmonia/ui";
import type { RefObject } from "react";
import { useMobileBottomNavState } from "@/hooks/use-mobile-bottom-nav-state";

export function ScrollToTopButton({
	visible,
	scrollDirection,
	containerRef,
}: {
	visible: boolean;
	scrollDirection: "up" | "down";
	containerRef: RefObject<HTMLDivElement | null>;
}) {
	const { hidden, showAnalysisBar } = useMobileBottomNavState();

	const bottomClass = hidden
		? "bottom-3"
		: showAnalysisBar
			? "bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:bottom-3"
			: "bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] md:bottom-3";

	const opacityClass = !visible
		? "pointer-events-none opacity-0"
		: scrollDirection === "down"
			? "opacity-20 hover:opacity-100 focus-visible:opacity-100"
			: "opacity-100";

	return (
		<button
			type="button"
			aria-label="Scroll to top"
			onClick={() =>
				containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
			}
			className={cn(
				"fixed right-3 z-40 flex size-11 items-center justify-center rounded-none border bg-background text-foreground shadow-lg transition-opacity duration-300",
				bottomClass,
				opacityClass,
			)}
		>
			<Icons.chevronUp className="size-4" aria-hidden />
		</button>
	);
}
