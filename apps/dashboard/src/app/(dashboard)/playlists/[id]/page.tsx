"use client";

import {usePathname} from "next/navigation";
export default function PlaylistDetailPage() {
	const pathname = usePathname();


	return <div>{pathname}</div>;
}