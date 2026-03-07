import { registerTracing } from "@harmonia/tracing";

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		registerTracing({
			serviceName: process.env.OTEL_SERVICE_NAME ?? "harmonia-api",
			samplingRate: process.env.OTEL_SAMPLING_RATE
				? Number.parseFloat(process.env.OTEL_SAMPLING_RATE)
				: 1,
			enabled:
				process.env.OTEL_ENABLED === "true" || process.env.OTEL_ENABLED === "1",
			useSimpleSpanProcessor: process.env.VERCEL === "1",
			otlp:
				process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
				process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: process.env.OTEL_EXPORTER_OTLP_HEADERS,
							compression:
								process.env.OTEL_EXPORTER_OTLP_COMPRESSION === "gzip"
									? "gzip"
									: undefined,
						}
					: undefined,
		});
	}
}
