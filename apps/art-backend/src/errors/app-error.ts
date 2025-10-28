export type AppErrorParams = Readonly<{
	message: string;
	code: string;
	name?: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}>;

const freezeContext = (context: Record<string, unknown> | undefined) =>
	Object.freeze({ ...(context ?? {}) });

export class AppError extends Error {
	readonly code: string;

	readonly context: Readonly<Record<string, unknown>>;

	readonly cause?: unknown;

	constructor(params: AppErrorParams) {
		super(params.message);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = params.name ?? new.target.name;
		this.code = params.code;
		this.context = freezeContext(params.context);
		if (params.cause !== undefined) {
			this.cause = params.cause;
		}
	}
}
