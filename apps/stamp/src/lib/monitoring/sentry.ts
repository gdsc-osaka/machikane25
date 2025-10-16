/* v8 ignore start */
import * as Sentry from "@sentry/nextjs";

const isEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export type SentryContext = {
	tags?: Record<string, string>;
	extra?: Record<string, unknown>;
	user?: { id?: string };
};

export const withSentryScope = <T>(
	context: SentryContext,
	callback: () => T,
): T => {
	if (!isEnabled) {
		return callback();
	}
	return Sentry.withScope((scope) => {
		if (context.tags) {
			Object.entries(context.tags).forEach(([key, value]) => {
				scope.setTag(key, value);
			});
		}
		if (context.extra) {
			Object.entries(context.extra).forEach(([key, value]) => {
				scope.setExtra(key, value);
			});
		}
		if (context.user) {
			scope.setUser(context.user);
		}
		return callback();
	});
};

export const captureError = (error: unknown, context: SentryContext = {}) => {
	if (!isEnabled) {
		return;
	}
	withSentryScope(context, () => {
		Sentry.captureException(error);
	});
};

export const captureMessage = (
	message: string,
	context: SentryContext = {},
) => {
	if (!isEnabled) {
		return;
	}
	withSentryScope(context, () => {
		Sentry.captureMessage(message);
	});
};

export const setSentryUser = (user: { id?: string } | null) => {
	if (!isEnabled) {
		return;
	}
	Sentry.setUser(user ?? null);
};
