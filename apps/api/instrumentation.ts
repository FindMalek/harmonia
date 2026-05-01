import { registerTracing } from "@harmonia/tracing";

export function register() {
	if (process.env.HARMONIA_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName: process.env.HARMONIA_OTEL_SERVICE_NAME ?? "harmonia-api",
			samplingRate: process.env.HARMONIA_OTEL_SAMPLING_RATE
				? Number.parseFloat(process.env.HARMONIA_OTEL_SAMPLING_RATE)
				: undefined,
			enabled:
				process.env.HARMONIA_OTEL_ENABLED === "true" ||
				process.env.HARMONIA_OTEL_ENABLED === "1",
			otlp:
				process.env.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT ||
				process.env.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: process.env.HARMONIA_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								process.env.HARMONIA_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								process.env.HARMONIA_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint:
								process.env.HARMONIA_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: process.env.HARMONIA_OTEL_EXPORTER_OTLP_HEADERS,
							compression:
								process.env.HARMONIA_OTEL_EXPORTER_OTLP_COMPRESSION === "gzip"
									? "gzip"
									: undefined,
						}
					: undefined,
		});
	}
}
