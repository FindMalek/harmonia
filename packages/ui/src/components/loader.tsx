import { Icons } from "./icons";

export function Loader() {
	return (
		<div className="flex h-full items-center justify-center pt-8">
			<Icons.spinner className="animate-spin" />
		</div>
	);
}
