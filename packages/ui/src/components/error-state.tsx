"use client";

import { AlertCircle } from "lucide-react";

import { CopyableError } from "./copyable-error";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type ErrorStateProps = {
	message: string;
	onRetry?: () => void;
	className?: string;
};

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-none border border-destructive/20 bg-destructive/5 p-4",
				className,
			)}
		>
			<div className="flex items-center gap-2 text-destructive">
				<AlertCircle className="size-4 shrink-0" />
				<span className="font-medium text-sm">Something went wrong</span>
			</div>
			<CopyableError text={message} variant="error" />
			{onRetry && (
				<Button variant="outline" size="sm" onClick={onRetry}>
					Retry
				</Button>
			)}
		</div>
	);
}
