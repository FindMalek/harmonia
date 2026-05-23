import { dashboardEnv } from "@harmonia/env/presets/dashboard";
import { registerTracing } from "@harmonia/tracing";

export function register() {
	if (dashboardEnv.HARMONIA_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName:
				dashboardEnv.HARMONIA_OTEL_SERVICE_NAME ?? "harmonia-dashboard",
			samplingRate: dashboardEnv.HARMONIA_OTEL_SAMPLING_RATE,
			enabled: dashboardEnv.HARMONIA_OTEL_ENABLED,
			otlp:
				dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT ||
				dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint:
								dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_HEADERS,
							compression: dashboardEnv.HARMONIA_OTEL_EXPORTER_OTLP_COMPRESSION,
						}
					: undefined,
		});
	}
}
