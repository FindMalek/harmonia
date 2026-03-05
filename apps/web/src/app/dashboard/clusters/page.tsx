"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function ClustersPage() {
	const { data: clusters, isLoading } = useQuery(
		orpc.clusters.list.queryOptions(),
	);
	const [selectedClusterId, setSelectedClusterId] = useState<number | null>(
		null,
	);

	const { data: clusterDetail } = useQuery({
		...orpc.clusters.getById.queryOptions({
			input: { id: selectedClusterId ?? 0 },
		}),
		enabled: selectedClusterId !== null,
	});

	if (isLoading) {
		return (
			<div className="text-muted-foreground text-xs">Loading clusters...</div>
		);
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="font-semibold text-base">Clusters</h2>
				<p className="text-muted-foreground text-xs">
					{clusters?.length ?? 0} clusters discovered
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{clusters?.map((c) => {
					const meta = c.metadata as {
						themeSummary?: string;
						dominantMood?: string;
						dominantEnergy?: string;
						topThemes?: string[];
						topVibes?: string[];
						suggestedArchetype?: string;
					} | null;

					return (
						<Card
							key={c.id}
							className={`cursor-pointer transition-colors hover:bg-muted/50 ${
								selectedClusterId === c.id ? "ring-2 ring-primary" : ""
							}`}
							onClick={() => setSelectedClusterId(c.id)}
						>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Cluster #{c.id}</CardTitle>
									<Badge variant="secondary" className="text-[10px]">
										{c.size} tracks
									</Badge>
								</div>
								{meta?.themeSummary && (
									<CardDescription className="line-clamp-2">
										{meta.themeSummary}
									</CardDescription>
								)}
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-1">
									{meta?.dominantMood && (
										<Badge variant="outline" className="text-[10px]">
											{meta.dominantMood}
										</Badge>
									)}
									{meta?.dominantEnergy && (
										<Badge variant="outline" className="text-[10px]">
											{meta.dominantEnergy}
										</Badge>
									)}
									{meta?.suggestedArchetype && (
										<Badge variant="secondary" className="text-[10px]">
											{meta.suggestedArchetype}
										</Badge>
									)}
								</div>
								{meta?.topThemes && meta.topThemes.length > 0 && (
									<p className="mt-2 text-[11px] text-muted-foreground">
										{meta.topThemes.join(", ")}
									</p>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{!clusters?.length && (
				<p className="text-muted-foreground text-xs">
					No clusters yet. Run the pipeline first.
				</p>
			)}

			{clusterDetail && (
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-sm">
							Cluster #{clusterDetail.id} &mdash; Tracks
						</CardTitle>
						<CardDescription>
							{clusterDetail.tracks?.length ?? 0} tracks in this cluster
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="max-h-[400px] overflow-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-xs">#</TableHead>
										<TableHead className="text-xs">Track</TableHead>
										<TableHead className="text-xs">Artist</TableHead>
										<TableHead className="text-xs">Mood</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{clusterDetail.tracks?.map((t) => {
										const artists = safeParseArray(t.artistNames);
										return (
											<TableRow key={t.id}>
												<TableCell className="text-muted-foreground text-xs">
													{(t.position ?? 0) + 1}
												</TableCell>
												<TableCell className="font-medium text-xs">
													{t.name}
												</TableCell>
												<TableCell className="text-muted-foreground text-xs">
													{artists.join(", ")}
												</TableCell>
												<TableCell className="text-muted-foreground text-xs">
													{t.llmMood ?? "—"}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function safeParseArray(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
