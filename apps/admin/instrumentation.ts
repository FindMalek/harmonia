import { adminEnv } from "@harmonia/env/presets/admin";
import { registerTracing } from "@harmonia/tracing";

export function register() {
	if (adminEnv.HARMONIA_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName: adminEnv.HARMONIA_OTEL_SERVICE_NAME ?? "harmonia-admin",
			samplingRate: adminEnv.HARMONIA_OTEL_SAMPLING_RATE,
			enabled: adminEnv.HARMONIA_OTEL_ENABLED,
			otlp:
				adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT ||
				adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint: adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_HEADERS,
							compression: adminEnv.HARMONIA_OTEL_EXPORTER_OTLP_COMPRESSION,
						}
					: undefined,
		});
	}
}
