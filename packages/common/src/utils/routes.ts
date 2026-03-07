/**
 * Centralized route configuration for the Harmonia frontend.
 * Single source of truth for paths, labels, icons, and nested routes.
 *
 * Icon keys must match keys in @harmonia/ui Icons (logo, play, music, layers, disc, fileText, etc.)
 */

/** Web app routes (marketing, landing, etc.) */
export const WEB_ROUTES = {
	home: {
		path: "/",
		label: "Home",
	},
} as const;

export type WebRoutes = typeof WEB_ROUTES;
export type WebRouteKey = keyof WebRoutes;

/** Dashboard app routes */
export const DASHBOARD_ROUTES = {
	overview: {
		path: "/",
		label: "Overview",
		icon: "logo",
		isNav: true,
	},
	pipeline: {
		path: "/pipeline",
		label: "Pipeline",
		icon: "play",
		isNav: true,
	},
	tracks: {
		path: "/tracks",
		label: "Tracks",
		icon: "music",
		isNav: true,
	},
	clusters: {
		path: "/clusters",
		label: "Clusters",
		icon: "layers",
		isNav: true,
	},
	playlists: {
		path: "/playlists",
		label: "Playlists",
		icon: "disc",
		isNav: true,
		children: {
			detail: {
				path: "/playlists/:id",
				label: "Playlist Detail",
			},
		},
	},
	todos: {
		path: "/todos",
		label: "Todos",
		icon: "fileText",
		isNav: true,
	},
} as const;

export type DashboardRoutes = typeof DASHBOARD_ROUTES;
export type DashboardRouteKey = keyof DashboardRoutes;

/** Dashboard routes that appear in the main navigation */
export const DASHBOARD_NAV_ITEMS = (
	Object.entries(DASHBOARD_ROUTES) as [
		DashboardRouteKey,
		(typeof DASHBOARD_ROUTES)[DashboardRouteKey],
	][]
)
	.filter(([, route]) => route.isNav)
	.map(([key, route]) => ({ key, ...route }));
