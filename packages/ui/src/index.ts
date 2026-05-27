// UI components

// Shared components
export type { HeaderLink } from "./components/header";
export { Header } from "./components/header";
export { Providers } from "./components/providers/providers";
export { ThemeProvider } from "./components/providers/theme-provider";
export type { Icon } from "./components/shared/icons";
export { Icons } from "./components/shared/icons";
export { ModeToggle } from "./components/shared/mode-toggle";
export { UserMenu } from "./components/shared/user-menu";
export { Badge, badgeVariants } from "./components/ui/badge";
export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "./components/ui/breadcrumb";
export { Button, buttonVariants } from "./components/ui/button";
export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./components/ui/card";
export { Checkbox } from "./components/ui/checkbox";
export * from "./components/ui/drawer";
export {
	InsightSectionCard,
	InsightStatCard,
} from "./components/ui/insight-stat-card";
export {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
} from "./components/ui/chart";
export type { ChartConfig } from "./components/ui/chart";
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export { Progress } from "./components/ui/progress";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export { Separator } from "./components/ui/separator";
export {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "./components/ui/sheet";
export { Skeleton } from "./components/ui/skeleton";
export { Toaster } from "./components/ui/sonner";
export { Spinner } from "./components/ui/spinner";
export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/ui/table";
export {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	tabsListVariants,
} from "./components/ui/tabs";
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./components/ui/tooltip";

// Lib
export { cn } from "./lib/utils";

// Brand (dashboard / web chrome only — emails use @harmonia/email)
export { brandTokens, HarmoniaBrandHeader } from "./theme/brand";

// Types
export type { AuthClientForUI } from "./types/auth";
