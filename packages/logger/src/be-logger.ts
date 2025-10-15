import {Logger} from "./logger";

// TODO: Google Cloud Logging 用の Logger 実装を追加する
export const beLogger: Logger = {
    debug: (...args: any[]) => {
        console.debug(...args);
    },
    info: (...args: any[]) => {
        console.info(...args);
    },
    warn: (...args: any[]) => {
        console.warn(...args);
    },
    error: (...args: any[]) => {
        console.error(...args);
    }
}