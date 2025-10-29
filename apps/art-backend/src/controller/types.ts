import type { Context } from "hono";

export type ControllerVariables = Readonly<{
	correlationId: string;
}>;

export type ControllerEnv = {
	Variables: ControllerVariables;
};

const correlationIdKey = "correlationId";

export const setCorrelationId = (c: Context<ControllerEnv>, value: string) => {
	c.set(correlationIdKey, value);
};

export const getCorrelationId = (
	c: Context<ControllerEnv>,
): string | undefined => {
	try {
		return c.get(correlationIdKey);
	} catch {
		return undefined;
	}
};
