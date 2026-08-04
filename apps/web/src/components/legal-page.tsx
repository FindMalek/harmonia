import { WEB_ROUTES } from "@harmonia/common/utils/routes";
import { HarmoniaBrandHeader, Icons } from "@harmonia/ui";
import { marked } from "marked";
import Link from "next/link";

export function LegalPage({ markdown }: { markdown: string }) {
	const html = marked.parse(markdown, { async: false });

	return (
		<div className="min-h-svh bg-background font-sans">
			<div className="container max-w-3xl px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
				<div className="mb-10 flex items-center justify-between">
					<HarmoniaBrandHeader />
					<Link
						href={WEB_ROUTES.home.path}
						className="flex items-center text-muted-foreground text-sm hover:text-foreground"
					>
						<Icons.chevronLeft className="mr-1 size-4" />
						Back
					</Link>
				</div>

				<div
					className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-foreground"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</div>
		</div>
	);
}
