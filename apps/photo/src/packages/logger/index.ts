import { beLogger } from "./be-logger";
import { feLogger } from "./fe-logger";

export const getLogger = () => (window === undefined ? beLogger : feLogger);

export default {
	getLogger,
};
