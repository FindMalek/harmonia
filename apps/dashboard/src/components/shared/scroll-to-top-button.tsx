"use client";

import { cn, Icons } from "@harmonia/ui";
import type { RefObject } from "react";
import { useMobileBottomNavState } from "@/hooks/use-mobile-bottom-nav-state";

export function ScrollToTopButton({
	visible,
	containerRef,
}: {
	visible: boolean;
	containerRef: RefObject<HTMLDivElement | null>;
}) {
	const { hidden, showAnalysisBar } = useMobileBottomNavState();

	const bottomClass = hidden
		? "bottom-4"
		: showAnalysisBar
			? "bottom-[calc(9.75rem+env(safe-area-inset-bottom,0px))] md:bottom-4"
			: "bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:bottom-4";

	return (
		<button
			type="button"
			aria-label="Scroll to top"
			onClick={() =>
				containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
			}
			className={cn(
				"fixed right-4 z-40 flex size-11 items-center justify-center rounded-full border bg-background text-foreground shadow-lg transition-opacity duration-200",
				bottomClass,
				visible ? "opacity-100" : "pointer-events-none opacity-0",
			)}
		>
			<Icons.chevronUp className="size-5" aria-hidden />
		</button>
	);
}
