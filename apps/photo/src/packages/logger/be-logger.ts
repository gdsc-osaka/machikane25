import type { Logger } from "./logger";

// TODO: Add Google Cloud Logging implementation for backend usage
export const beLogger: Logger = {
	debug: (...args: readonly unknown[]) => {
		console.debug(...args);
	},
	info: (...args: readonly unknown[]) => {
		console.info(...args);
	},
	warn: (...args: readonly unknown[]) => {
		console.warn(...args);
	},
	error: (...args: readonly unknown[]) => {
		console.error(...args);
	},
};
