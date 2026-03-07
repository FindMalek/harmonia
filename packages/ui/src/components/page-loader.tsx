import { Icons } from "./icons";

type PageLoaderProps = {
	message?: string;
	className?: string;
};

export function PageLoader({
	message = "Loading...",
	className,
}: PageLoaderProps) {
	return (
		<div
			className={`flex h-32 flex-col items-center justify-center gap-3 text-muted-foreground ${className ?? ""}`}
		>
			<Icons.spinner className="size-6 animate-spin" />
			<p className="text-xs">{message}</p>
		</div>
	);
}
