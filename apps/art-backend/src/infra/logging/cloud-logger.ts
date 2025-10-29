import type { Config } from "../../config/env.js";

type Severity = "INFO" | "WARNING" | "ERROR";

export type LogFn = (
	message: string,
	context?: Record<string, unknown>,
) => void;

export type Logger = Readonly<{
	info: LogFn;
	warn: LogFn;
	error: LogFn;
}>;

type LoggerDeps = Readonly<{
	config: Config;
	requestId?: string;
}>;

const buildContext = (
	requestId: string | undefined,
	context: Record<string, unknown> | undefined,
) => {
	const base = requestId === undefined ? {} : { requestId };
	return context === undefined ? base : { ...context, ...base };
};

const buildEntry = (
	severity: Severity,
	message: string,
	context: Record<string, unknown>,
	config: Config,
) => ({
	severity,
	message,
	timestamp: new Date().toISOString(),
	resource: {
		type: "cloud_run_revision",
		labels: {
			project_id: config.firebaseProjectId,
		},
	},
	context,
});

const createLogFn = (
	writer: (payload: string) => void,
	severity: Severity,
	deps: LoggerDeps,
): LogFn => {
	return (message, context) => {
		const entry = buildEntry(
			severity,
			message,
			buildContext(deps.requestId, context),
			deps.config,
		);

		writer(JSON.stringify(entry));
	};
};

export const createLogger = (deps: LoggerDeps): Logger => {
	const info = createLogFn(console.log, "INFO", deps);
	const warn = createLogFn(console.warn, "WARNING", deps);
	const error = createLogFn(console.error, "ERROR", deps);

	return Object.freeze({
		info,
		warn,
		error,
	});
};
