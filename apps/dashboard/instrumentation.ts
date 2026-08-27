import { dashboardEnv } from "@sonaraem/env/presets/dashboard";
import { registerTracing } from "@sonaraem/tracing";

export function register() {
	if (dashboardEnv.SONARAEM_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName:
				dashboardEnv.SONARAEM_OTEL_SERVICE_NAME ?? "sonaraem-dashboard",
			samplingRate: dashboardEnv.SONARAEM_OTEL_SAMPLING_RATE,
			enabled: dashboardEnv.SONARAEM_OTEL_ENABLED,
			otlp:
				dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT ||
				dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint:
								dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_HEADERS,
							compression: dashboardEnv.SONARAEM_OTEL_EXPORTER_OTLP_COMPRESSION,
						}
					: undefined,
		});
	}
}
