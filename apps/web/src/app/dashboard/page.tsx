import { auth } from "@harmonia/auth";
import { env } from "@harmonia/env/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardOverview } from "./overview";

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	const spotifyEnabled = !!env.SPOTIFY_CLIENT_ID;
	return <DashboardOverview spotifyEnabled={spotifyEnabled} />;
}
