import { feLogger } from "./fe-logger";
import {beLogger} from "./be-logger";

export const getLogger = () => window === undefined ? beLogger : feLogger;

export default {
	getLogger,
};
