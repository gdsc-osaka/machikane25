import { beLogger } from "./be-logger";
import { feLogger } from "./fe-logger";

export const getLogger = () =>
	typeof window === "undefined" ? beLogger : feLogger;

export default {
	getLogger,
};
