export interface Logger {
	debug: (...args: readonly unknown[]) => void;
	info: (...args: readonly unknown[]) => void;
	warn: (...args: readonly unknown[]) => void;
	error: (...args: readonly unknown[]) => void;
}
