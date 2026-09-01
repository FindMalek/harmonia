import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WEB_ROUTES } from "@sonaraem/common/utils/routes";
import { Icons, SonaraemBrandHeader } from "@sonaraem/ui";
import { marked } from "marked";
import Link from "next/link";

export function LegalPage({ slug }: { slug: "privacy" | "terms" }) {
	const markdown = readFileSync(
		join(process.cwd(), "src/content", `${slug}.md`),
		"utf-8",
	);
	const html = marked.parse(markdown, { async: false });

	return (
		<div className="min-h-svh bg-background font-sans">
			<div className="container max-w-3xl px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
				<div className="mb-10 flex items-center justify-between">
					<SonaraemBrandHeader />
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
