"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * Tracks a scrollable container's position as a couple of threshold booleans
 * (not the raw offset), so consumers only re-render on state transitions —
 * React bails out on repeated identical boolean values. Also tracks scroll
 * direction for UI that should fade in/out based on which way the user is
 * scrolling (e.g. a back-to-top button).
 */
export function useScrollFlags(
	containerRef: RefObject<HTMLDivElement | null>,
	{ collapseAt, backToTopAt }: { collapseAt: number; backToTopAt: number },
) {
	const [scrolled, setScrolled] = useState(false);
	const [showBackToTop, setShowBackToTop] = useState(false);
	const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
	const lastScrollTopRef = useRef(0);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const onScroll = () => {
			const top = el.scrollTop;
			setScrolled(top > collapseAt);
			setShowBackToTop(top > backToTopAt);
			if (top !== lastScrollTopRef.current) {
				setScrollDirection(top > lastScrollTopRef.current ? "down" : "up");
				lastScrollTopRef.current = top;
			}
		};
		onScroll();

		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, [containerRef, collapseAt, backToTopAt]);

	return { scrolled, showBackToTop, scrollDirection };
}
