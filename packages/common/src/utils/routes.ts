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
		icon: "home",
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
				hideBottomNav: true,
			},
		},
	},
	todos: {
		path: "/todos",
		label: "Todos",
		icon: "fileText",
		isNav: true,
	},
	insights: {
		path: "/insights",
		label: "Insights",
		icon: "chart",
		isNav: true,
	},
	settings: {
		path: "/settings",
		label: "Settings",
		icon: "settings",
		isNav: true,
	},
} as const;

export type DashboardRoutes = typeof DASHBOARD_ROUTES;
export type DashboardRouteKey = keyof DashboardRoutes;

/** Dashboard routes that appear in the main navigation */
export const DASHBOARD_NAV_ITEMS = Object.entries(DASHBOARD_ROUTES)
	.filter(([, route]) => route.isNav)
	.map(([key, route]) => ({ key, ...route }));

/** Dashboard routes that appear in the mobile bottom navigation */
export const DASHBOARD_MOBILE_NAV_ITEMS = [
	{ ...DASHBOARD_ROUTES.overview, key: "overview", label: "Dashboard" },
	{ ...DASHBOARD_ROUTES.playlists, key: "playlists" },
	{ ...DASHBOARD_ROUTES.insights, key: "insights" },
	{ ...DASHBOARD_ROUTES.settings, key: "settings" },
];
