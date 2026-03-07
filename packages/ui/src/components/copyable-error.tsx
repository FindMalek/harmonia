"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type CopyableErrorProps = {
	text: string;
	variant?: "error" | "warning";
	label?: string;
	className?: string;
};

export function CopyableError({
	text,
	variant = "error",
	label = "Copy",
	className,
}: CopyableErrorProps) {
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy");
		}
	};

	return (
		<div
			className={cn(
				"flex items-start justify-between gap-2",
				variant === "error" ? "text-destructive" : "text-yellow-600",
				className,
			)}
		>
			<pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap wrap-break-word font-sans text-xs">
				{text}
			</pre>
			<Button
				variant="ghost"
				size="icon-xs"
				onClick={handleCopy}
				className="shrink-0"
				aria-label={label}
			>
				<Copy className="size-3" />
			</Button>
		</div>
	);
}
