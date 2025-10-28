import type { Config } from "../../config/env.js";

export type LogFn = (
	message: string,
	context?: Record<string, unknown>,
) => void;

export type Logger = Readonly<{
	info: LogFn;
	warn: LogFn;
	error: LogFn;
}>;

type Severity = "INFO" | "WARNING" | "ERROR";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const safeStringify = (value: unknown) => {
	const seen = new WeakSet<object>();
	return JSON.stringify(value, (_, nested) => {
		if (typeof nested === "bigint") {
			return nested.toString();
		}
		if (isRecord(nested)) {
			if (seen.has(nested)) {
				return "[Circular]";
			}
			seen.add(nested);
		}
		return nested;
	});
};

const sanitizeContext = (
	config: Config,
	requestId: string | undefined,
	context: Record<string, unknown> | undefined,
) => {
	const combined = {
		projectId: config.firebaseProjectId,
		...(requestId === undefined ? {} : { requestId }),
		...(context ?? {}),
	};
	return Object.fromEntries(
		Object.entries(combined).filter(([, value]) => value !== undefined),
	);
};

const createLogFunction = (
	severity: Severity,
	writer: (line: string) => void,
	deps: Readonly<{ config: Config; requestId?: string }>,
): LogFn => {
	return (message, context) => {
		const entry = {
			severity,
			message,
			timestamp: new Date().toISOString(),
			context: sanitizeContext(deps.config, deps.requestId, context),
		};

		try {
			writer(safeStringify(entry));
		} catch {
			writer(`[${severity}] ${message}`);
		}
	};
};

export const createLogger = (
	deps: Readonly<{ config: Config; requestId?: string }>,
): Logger => {
	const info = createLogFunction("INFO", console.log, deps);
	const warn = createLogFunction("WARNING", console.warn, deps);
	const error = createLogFunction("ERROR", console.error, deps);

	return Object.freeze({
		info,
		warn,
		error,
	});
};
