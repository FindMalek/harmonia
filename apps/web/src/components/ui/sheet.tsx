"use client";

import { X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SheetContextValue = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
	const ctx = React.useContext(SheetContext);
	if (!ctx) throw new Error("Sheet components must be used within Sheet");
	return ctx;
}

function Sheet({
	open,
	onOpenChange,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}) {
	return (
		<SheetContext.Provider value={{ open, onOpenChange }}>
			{children}
		</SheetContext.Provider>
	);
}

function SheetContent({
	side = "right",
	className,
	children,
	showCloseButton = true,
}: {
	side?: "top" | "right" | "bottom" | "left";
	className?: string;
	children: React.ReactNode;
	showCloseButton?: boolean;
}) {
	const { open, onOpenChange } = useSheet();

	if (!open || typeof document === "undefined") return null;

	const slideClasses = {
		right:
			"inset-y-0 right-0 h-full w-full max-w-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
		left: "inset-y-0 left-0 h-full w-full max-w-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
		top: "inset-x-0 top-0 w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom:
			"inset-x-0 bottom-0 w-full data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
	};

	return createPortal(
		<>
			<div
				aria-hidden
				className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				data-state={open ? "open" : "closed"}
				onClick={() => onOpenChange(false)}
			/>
			<div
				className={cn(
					"fixed z-50 flex flex-col gap-4 border bg-background p-4 shadow-lg duration-200",
					slideClasses[side],
					className,
				)}
				data-state={open ? "open" : "closed"}
				onClick={(e) => e.stopPropagation()}
			>
				{showCloseButton && (
					<Button
						variant="ghost"
						size="icon-xs"
						className="absolute right-2 top-2"
						onClick={() => onOpenChange(false)}
						aria-label="Close"
					>
						<X className="size-4" />
					</Button>
				)}
				{children}
			</div>
		</>,
		document.body,
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 pr-8", className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-title"
			className={cn("font-semibold text-sm", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-xs", className)}
			{...props}
		/>
	);
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription };
