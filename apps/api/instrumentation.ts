import { apiEnv } from "@sonaraem/env/presets/api";
import { registerTracing } from "@sonaraem/tracing";
import { configure as configureTrigger } from "@trigger.dev/sdk";

export function register() {
	// @trigger.dev/sdk defaults to reading process.env.TRIGGER_SECRET_KEY, but
	// this repo prefixes every third-party secret with SONARAEM_ — point the
	// SDK at the real value directly instead of relying on an unprefixed env
	// var that's never actually set in Vercel's runtime.
	if (apiEnv.SONARAEM_TRIGGER_SECRET_KEY) {
		configureTrigger({ accessToken: apiEnv.SONARAEM_TRIGGER_SECRET_KEY });
	}

	if (apiEnv.SONARAEM_OTEL_SERVICE_NAME) {
		registerTracing({
			serviceName: apiEnv.SONARAEM_OTEL_SERVICE_NAME ?? "sonaraem-api",
			samplingRate: apiEnv.SONARAEM_OTEL_SAMPLING_RATE,
			enabled: apiEnv.SONARAEM_OTEL_ENABLED,
			otlp:
				apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT ||
				apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
					? {
							endpoint: apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT,
							tracesEndpoint:
								apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
							metricsEndpoint:
								apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
							logsEndpoint: apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
							headers: apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_HEADERS,
							compression: apiEnv.SONARAEM_OTEL_EXPORTER_OTLP_COMPRESSION,
						}
					: undefined,
		});
	}
}
