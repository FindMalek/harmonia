"use client";

import { client } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
	readPersistedActivePipelineRunId,
	useOrganizeStore,
	writePersistedActivePipelineRunId,
} from "@/shared/lib/organize/store";
import { usePipelineController } from "@/shared/lib/pipeline/controller.hook";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

function runCreatedAtMs(run: { createdAt: Date | string }) {
	const d =
		run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
	return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function useDashboardPipelineBootstrap() {
	const queryClient = useQueryClient();
	const { runs } = usePipelineController();
	const activeRunId = useOrganizeStore((s) => s.activeRunId);
	const setActiveRunId = useOrganizeStore((s) => s.setActiveRunId);
	const [persistedRunResolved, setPersistedRunResolved] = useState(false);

	useEffect(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.pipeline() });
	}, [queryClient]);

	useEffect(() => {
		const persisted = readPersistedActivePipelineRunId();
		if (persisted === null) {
			setPersistedRunResolved(true);
			return;
		}

		void client.pipeline
			.getById({ id: persisted })
			.then((run) => {
				if (run?.status === "running") {
					setActiveRunId(persisted);
				} else {
					writePersistedActivePipelineRunId(null);
				}
			})
			.catch(() => {
				writePersistedActivePipelineRunId(null);
			})
			.finally(() => {
				setPersistedRunResolved(true);
			});
	}, [setActiveRunId]);

	useEffect(() => {
		if (!persistedRunResolved || activeRunId != null) return;
		const list = runs.data;
		if (!list?.length) return;

		const running = list.filter((r) => r.status === "running");
		if (running.length === 0) return;

		const newest = [...running].sort(
			(a, b) => runCreatedAtMs(b) - runCreatedAtMs(a),
		)[0];
		if (newest) setActiveRunId(newest.id);
	}, [persistedRunResolved, activeRunId, runs.data, setActiveRunId]);
}
