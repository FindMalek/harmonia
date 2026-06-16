export const adminQueryKeys = {
	stats: ["admin", "stats"] as const,
	waitlist: {
		all: ["admin", "waitlist"] as const,
		list: (params: Record<string, unknown>) =>
			["admin", "waitlist", "list", params] as const,
	},
	users: {
		all: ["admin", "users"] as const,
		list: (params: Record<string, unknown>) =>
			["admin", "users", "list", params] as const,
	},
} as const;
