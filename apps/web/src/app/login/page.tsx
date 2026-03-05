import { env } from "@harmonia/env/server";

import LoginPageClient from "./login-page-client";

export default function LoginPage() {
	const spotifyEnabled = !!env.SPOTIFY_CLIENT_ID;
	return <LoginPageClient spotifyEnabled={spotifyEnabled} />;
}
