import type * as React from "react";

// "Ascending Pulse" mark — canonical geometry, mirrored in apps/*/src/app/icon.svg
// (each app bakes in its own fill color there since Next's icon.svg route can't
// consume this component). Keep both in sync if the mark ever changes.
export function Logo(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 100 100"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Sonaraem</title>
			<rect x="20" y="58" width="9" height="15" rx="4.5" />
			<rect x="33" y="44" width="9" height="29" rx="4.5" />
			<rect x="46" y="30" width="9" height="43" rx="4.5" />
			<rect x="59" y="49" width="9" height="24" rx="4.5" opacity="0.55" />
			<rect x="72" y="38" width="9" height="35" rx="4.5" opacity="0.8" />
		</svg>
	);
}
