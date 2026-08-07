import { apiEnv } from "@harmonia/env/presets/api";
import { registerTracing } from "@harmonia/tracing";
import { configure as configureTrigger } from "@trigger.dev/sdk";

export function register() {
	// @trigger.dev/sdk defaults to reading process.env.TRIGGER_SECRET_KEY, but
	// this repo prefixes every third-party secret with HARMONIA_ — point the
	// SDK at the real value directly instead of relying on an unprefixed env
	// var that's never actually set in Vercel's runtime.
	if (apiEnv.HARMONIA_TRIGGER_SECRET_KEY) {
		configureTrigger({ accessToken: apiEnv.HARMONIA_TRIGGER_SECRET_KEY });
	}

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
