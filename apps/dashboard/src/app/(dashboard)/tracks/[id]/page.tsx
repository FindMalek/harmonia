"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import {
	DashboardTrackDetail,
	DashboardTrackDetailNotFound,
	DashboardTrackDetailSkeleton,
} from "@/components/app/dashboard-track-detail";
import { orpc } from "@/shared/api/orpc";

export default function TrackDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);

	const {
		data: track,
		isLoading,
		isError,
	} = useQuery(orpc.tracks.getById.queryOptions({ input: { id } }));

	if (isLoading) {
		return <DashboardTrackDetailSkeleton />;
	}

	if (isError || !track) {
		return <DashboardTrackDetailNotFound />;
	}

	return <DashboardTrackDetail track={track} />;
}
