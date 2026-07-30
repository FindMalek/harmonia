import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-svh items-center justify-center">
			<div className="space-y-4 text-center">
				<h1 className="font-semibold text-4xl">404</h1>
				<p className="text-muted-foreground">Page not found</p>
				<Link
					href="/"
					className="inline-block text-primary text-sm underline underline-offset-4"
				>
					Back to overview
				</Link>
			</div>
		</div>
	);
}
