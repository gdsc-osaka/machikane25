import {Logger} from "./logger";
import * as Sentry from "@sentry/nextjs";

export const frontLogger: Logger = {
    debug(...args: any[]) {
        console.debug(...args);
    },
    info(...args: any[]) {
        console.info(...args);
        if (process.env.NODE_ENV === "production") {
            Sentry.captureMessage(args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "), "info");
        }
    },
    warn(...args: any[]) {
        console.warn(...args);
        if (process.env.NODE_ENV === "production") {
            Sentry.captureMessage(args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "), "warning");
        }
    },
    error(...args: any[]) {
        console.error(...args);
        if (process.env.NODE_ENV === "production") {
            Sentry.captureException(args[0] instanceof Error ? args[0] : new Error(args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")));
        }
    }
}