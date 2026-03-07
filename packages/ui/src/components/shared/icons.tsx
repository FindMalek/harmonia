/**
 * Unified Icons Component
 *
 * Centralizes all icon exports from @tabler/icons-react.
 * All apps and components should import icons from this file for consistency.
 *
 * Usage:
 *   import { Icons } from "@harmonia/ui";
 *   <Icons.arrowLeft className="..." />
 *   <Icons.spinner className="animate-spin" />
 */

import {
	IconAlertCircle,
	IconAlertOctagon,
	IconAlertTriangle,
	IconBrain,
	IconCheck,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconChevronUp,
	IconCircleCheck,
	IconCopy,
	IconDisc,
	IconDots,
	IconFileText,
	IconInfoCircle,
	IconLayoutSidebar,
	IconLoader,
	IconMoon,
	IconSun,
	IconMinus,
	IconMusic,
	IconPlayerPlay,
	IconSearch,
	IconSelector,
	IconStack2,
	IconTrash,
	IconX,
	IconBrandBandlab,
} from "@tabler/icons-react";
import type * as React from "react";

export type Icon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export const Icons = {
	// UI / actions
	check: IconCheck,
	x: IconX,
	minus: IconMinus,
	search: IconSearch,
	selector: IconSelector,
	copy: IconCopy,
	trash: IconTrash,

	// Chevrons
	chevronDown: IconChevronDown,
	chevronUp: IconChevronUp,
	chevronLeft: IconChevronLeft,
	chevronRight: IconChevronRight,

	// Status / feedback
	spinner: IconLoader,
	circleCheck: IconCircleCheck,
	infoCircle: IconInfoCircle,
	alertTriangle: IconAlertTriangle,
	alertOctagon: IconAlertOctagon,
	alertCircle: IconAlertCircle,

	// Content / media
	music: IconMusic,
	disc: IconDisc,
	fileText: IconFileText,
	brain: IconBrain,
	layers: IconStack2,
	play: IconPlayerPlay,

	// Layout
	layoutSidebar: IconLayoutSidebar,
	dots: IconDots,

	// Theme
	moon: IconMoon,
	sun: IconSun,

	// Brand
	logo: IconBrandBandlab,
} as const;
