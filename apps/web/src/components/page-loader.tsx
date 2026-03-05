import { Loader2 } from "lucide-react";

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
			<Loader2 className="size-6 animate-spin" />
			<p className="text-xs">{message}</p>
		</div>
	);
}
