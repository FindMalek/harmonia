import { adminEnv } from "@sonaraem/env/presets/admin";
import { registerTracing } from "@sonaraem/tracing";

export function register() {
	if (adminEnv.SONARAEM_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName: adminEnv.SONARAEM_OTEL_SERVICE_NAME ?? "sonaraem-admin",
			samplingRate: adminEnv.SONARAEM_OTEL_SAMPLING_RATE,
			enabled: adminEnv.SONARAEM_OTEL_ENABLED,
			otlp:
				adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT ||
				adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint: adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_HEADERS,
							compression: adminEnv.SONARAEM_OTEL_EXPORTER_OTLP_COMPRESSION,
						}
					: undefined,
		});
	}
}
