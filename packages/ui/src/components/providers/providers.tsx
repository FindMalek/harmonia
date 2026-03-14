"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "../ui/sonner";
import { TooltipProvider } from "../ui/tooltip";
import { ThemeProvider } from "./theme-provider";

type ProvidersProps = {
	children: React.ReactNode;
	queryClient?: QueryClient;
};

export function Providers({ children, queryClient }: ProvidersProps) {
	const content = queryClient ? (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	) : (
		children
	);

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			enableSystem
			disableTransitionOnChange
		>
			<TooltipProvider>{content}</TooltipProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
