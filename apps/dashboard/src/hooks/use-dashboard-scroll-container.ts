"use client";

import { createContext, type RefObject, useContext } from "react";

export const DashboardScrollContainerContext =
	createContext<RefObject<HTMLDivElement | null> | null>(null);

/** The dashboard's single scrollable content area (see DashboardLayoutShell) — pages use this to react to scroll position without owning a scroll listener on `window`, which isn't where scrolling actually happens in this layout. */
export function useDashboardScrollContainer() {
	const ref = useContext(DashboardScrollContainerContext);
	if (!ref) {
		throw new Error(
			"useDashboardScrollContainer must be used within DashboardLayoutShell",
		);
	}
	return ref;
}
