import { serverClient } from "@/shared/api/orpc-server";

export async function adminAccountExists(): Promise<boolean> {
	const { needsSetup } = await serverClient.admin.setup.status();
	return !needsSetup;
}
