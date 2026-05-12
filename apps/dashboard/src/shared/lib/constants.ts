export const DASHBOARD_SESSION_STORAGE_KEYS = {
	ACTIVE_PIPELINE_RUN_ID: "harmonia.dashboard.activePipelineRunId",
	ANALYSIS_DRAWER_OPEN: "harmonia.dashboard.isAnalysisDrawerOpen",
} as const;

export const ONBOARDING_SYNC_MAX_ATTEMPTS = 6;
export const ONBOARDING_SYNC_INITIAL_BACKOFF_MS = 1000;
export const ONBOARDING_SYNC_MAX_BACKOFF_MS = 15000;

export const PIPELINE_HYDRATION_STALE_MS = 60_000;
