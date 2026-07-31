"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * Tracks a scrollable container's position as a couple of threshold booleans
 * (not the raw offset), so consumers only re-render on state transitions —
 * React bails out on repeated identical boolean values.
 */
export function useScrollFlags(
	containerRef: RefObject<HTMLDivElement | null>,
	{ collapseAt, backToTopAt }: { collapseAt: number; backToTopAt: number },
) {
	const [scrolled, setScrolled] = useState(false);
	const [showBackToTop, setShowBackToTop] = useState(false);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const onScroll = () => {
			setScrolled(el.scrollTop > collapseAt);
			setShowBackToTop(el.scrollTop > backToTopAt);
		};
		onScroll();

		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, [containerRef, collapseAt, backToTopAt]);

	return { scrolled, showBackToTop };
}
