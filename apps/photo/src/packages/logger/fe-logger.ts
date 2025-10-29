import * as Sentry from "@sentry/nextjs";
import type { Logger } from "./logger";

const isProduction = () => process.env.NODE_ENV === "production";

const safeStringify = (value: unknown) => {
	if (typeof value === "string") {
		return value;
	}
	try {
		const json = JSON.stringify(value);
		return json === undefined ? String(value) : json;
	} catch {
		return String(value);
	}
};

const formatArgs = (args: readonly unknown[]) =>
	args.map((arg) => safeStringify(arg)).join(" ");

const captureMessageIfNeeded = (
	args: readonly unknown[],
	level: "info" | "warning",
) => {
	if (!isProduction()) {
		return;
	}
	Sentry.captureMessage(formatArgs(args), level);
};

const captureExceptionIfNeeded = (args: readonly unknown[]) => {
	if (!isProduction()) {
		return;
	}
	const [firstArg] = args;
	const error =
		firstArg instanceof Error ? firstArg : new Error(formatArgs(args));
	Sentry.captureException(error);
};

export const feLogger: Logger = {
	debug: (...args: readonly unknown[]) => {
		console.debug(...args);
	},
	info: (...args: readonly unknown[]) => {
		console.info(...args);
		captureMessageIfNeeded(args, "info");
	},
	warn: (...args: readonly unknown[]) => {
		console.warn(...args);
		captureMessageIfNeeded(args, "warning");
	},
	error: (...args: readonly unknown[]) => {
		console.error(...args);
		captureExceptionIfNeeded(args);
	},
};
