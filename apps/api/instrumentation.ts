import { apiEnv } from "@harmonia/env/presets/api";
import { registerTracing } from "@harmonia/tracing";

export function register() {
	if (apiEnv.HARMONIA_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName: apiEnv.HARMONIA_OTEL_SERVICE_NAME ?? "harmonia-api",
			samplingRate: apiEnv.HARMONIA_OTEL_SAMPLING_RATE,
			enabled: apiEnv.HARMONIA_OTEL_ENABLED,
			otlp:
				apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT ||
				apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint: apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_HEADERS,
							compression: apiEnv.HARMONIA_OTEL_EXPORTER_OTLP_COMPRESSION,
						}
					: undefined,
		});
	}
}
