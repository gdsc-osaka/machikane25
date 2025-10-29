import { AppError } from "./app-error.js";

export type AuthenticationFailureReason = "missing" | "mismatch";

export type AuthenticationErrorParams = Readonly<{
	reason: AuthenticationFailureReason;
}>;

export class AuthenticationError extends AppError {
	readonly reason: AuthenticationFailureReason;

	constructor(params: AuthenticationErrorParams) {
		super({
			message: "Invalid API key",
			code: "AUTH_INVALID",
			name: "AuthenticationError",
			context: { reason: params.reason },
		});
		this.reason = params.reason;
	}
}
