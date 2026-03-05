import { Transform, type TransformCallback } from "node:stream";

type LogMethod = (obj: unknown, msg?: string) => void;

type Logger = {
	trace: LogMethod;
	debug: LogMethod;
	info: LogMethod;
	warn: LogMethod;
	error: LogMethod;
	fatal: LogMethod;
};

class PrettyFormatter extends Transform {
	override _transform(
		chunk: Buffer,
		_encoding: BufferEncoding,
		callback: TransformCallback,
	): void {
		try {
			const log = JSON.parse(chunk.toString()) as {
				level?: string;
				time?: string | number;
				msg?: string;
				[key: string]: unknown;
			};

			const { level, time, msg, ...rest } = log;

			const timestamp = new Date(time ?? Date.now())
				.toISOString()
				.replace("T", " ")
				.slice(0, 19);

			const upperLevel = (level ?? "info").toString().toUpperCase();

			const levelColors: Record<string, string> = {
				TRACE: "\x1b[90m",
				DEBUG: "\x1b[36m",
				INFO: "\x1b[32m",
				WARN: "\x1b[33m",
				ERROR: "\x1b[31m",
				FATAL: "\x1b[35m",
			};
			const reset = "\x1b[0m";
			const levelColor = levelColors[upperLevel] ?? "";
			const formattedLevel = `${levelColor}${upperLevel}${reset}`;

			let formatted = `[${timestamp}] ${formattedLevel}: ${msg ?? ""}`;

			const contextKeys = Object.keys(rest).filter(
				(key) => key !== "pid" && key !== "hostname",
			);

			if (contextKeys.length > 0) {
				formatted += "\n";

				for (const key of contextKeys) {
					const value = rest[key];
					const formattedValue =
						typeof value === "object" && value !== null
							? JSON.stringify(value, null, 2)
									.split("\n")
									.map((line, index) => (index === 0 ? line : ` ${line}`))
									.join("\n")
							: String(value);

					formatted += ` ${key}: ${formattedValue}\n`;
				}

				formatted = formatted.slice(0, -1);
			}

			this.push(`${formatted}\n`);
		} catch {
			this.push(chunk);
		}

		callback();
	}
}

const createConsoleLogger = (): Logger => {
	const log: LogMethod = (obj: unknown, msg?: string) => {
		if (typeof msg === "string") {
			// eslint-disable-next-line no-console
			console.log(msg, obj);
		} else {
			// eslint-disable-next-line no-console
			console.log(obj);
		}
	};

	return {
		trace: log,
		debug: log,
		info: log,
		warn: (obj: unknown, msg?: string) => {
			if (typeof msg === "string") {
				// eslint-disable-next-line no-console
				console.warn(msg, obj);
			} else {
				// eslint-disable-next-line no-console
				console.warn(obj);
			}
		},
		error: (obj: unknown, msg?: string) => {
			if (typeof msg === "string") {
				// eslint-disable-next-line no-console
				console.error(msg, obj);
			} else {
				// eslint-disable-next-line no-console
				console.error(obj);
			}
		},
		fatal: (obj: unknown, msg?: string) => {
			if (typeof msg === "string") {
				// eslint-disable-next-line no-console
				console.error(msg, obj);
			} else {
				// eslint-disable-next-line no-console
				console.error(obj);
			}
		},
	};
};

function isNodeEnvironment(): boolean {
	return (
		typeof process !== "undefined" &&
		typeof process.stdout !== "undefined" &&
		typeof window === "undefined"
	);
}

let loggerInstance: Logger | null = null;

function getLogger(): Logger {
	if (loggerInstance) {
		return loggerInstance;
	}

	if (!isNodeEnvironment()) {
		loggerInstance = createConsoleLogger();
		return loggerInstance;
	}

	const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV ?? process.env.NODE_ENV;
	const isDevelopment = nodeEnv !== "production";

	if (isDevelopment) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
			const pino = require("pino") as typeof import("pino");
			const prettyFormatter = new PrettyFormatter();

			prettyFormatter.pipe(process.stdout);

			const pinoLogger = pino(
				{
					level: "info",
					formatters: {
						level(label: string) {
							return { level: label.toUpperCase() };
						},
					},
					timestamp: pino.stdTimeFunctions.isoTime,
				},
				prettyFormatter,
			) as unknown as Logger;

			loggerInstance = pinoLogger;
		} catch {
			loggerInstance = createConsoleLogger();
		}
	} else {
		loggerInstance = createConsoleLogger();
	}

	return loggerInstance;
}

export const logger: Logger = new Proxy({} as Logger, {
	get(_target, property) {
		const instance = getLogger();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (instance as any)[property as keyof Logger];
	},
});

export { PrettyFormatter, createConsoleLogger, getLogger, isNodeEnvironment };

export default logger;
