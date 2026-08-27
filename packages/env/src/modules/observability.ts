import { z } from "zod";

/**
 * Observability module - defines OpenTelemetry configuration
 */
export const observabilityModule = {
	server: {
		SONARAEM_OTEL_SERVICE_NAME: z.string().default("sonaraem"),
		SONARAEM_OTEL_SAMPLING_RATE: z.coerce.number().min(0).max(1).default(1),
		SONARAEM_OTEL_ENABLED: z
			.string()
			.optional()
			.transform((val) => val === "true" || val === "1"),
		SONARAEM_OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
		SONARAEM_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().optional(),
		SONARAEM_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().optional(),
		SONARAEM_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: z.string().optional(),
		SONARAEM_OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
		SONARAEM_OTEL_EXPORTER_OTLP_PROTOCOL: z.enum(["http/protobuf"]).optional(),
		SONARAEM_OTEL_EXPORTER_OTLP_COMPRESSION: z.enum(["gzip"]).optional(),
	},
} as const;
