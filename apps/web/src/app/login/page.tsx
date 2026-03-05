import LoginPageClient from "./login-page-client";

export default function LoginPage() {
	const spotifyEnabled = !!process.env.SPOTIFY_CLIENT_ID;
	return <LoginPageClient spotifyEnabled={spotifyEnabled} />;
}
