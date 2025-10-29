import { Configuration, configure, getLogger } from "log4js";
import env from "./env";

type Logger = {
  debug: (message: unknown, ...args: unknown[]) => void;
  info: (message: unknown, ...args: unknown[]) => void;
  warn: (message: unknown, ...args: unknown[]) => void;
  error: (message: unknown, ...args: unknown[]) => void;
};
type LoggerBuilder = (label: string) => Logger;

const gcloudLogger =
  (category: string): LoggerBuilder =>
  (label: string) => {
    // Cloud Logging severities. See https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
    type Severity =
      | "DEBUG"
      | "INFO"
      | "NOTICE"
      | "WARNING"
      | "ERROR"
      | "CRITICAL"
      | "ALERT"
      | "EMERGENCY";

    const formatGCloudMessage = (
      category: string,
      severity: Severity,
      label: string,
      message: unknown,
      ...args: unknown[]
    ): string => {
      const _args = [message, ...args];
      const msg =
        `[${category}] ${label}: ${_args.filter((arg) => typeof arg !== "object").join(" ")}`.trimEnd();

      // args is like [{error: new Error(), user: {id: 1, name: "John Doe"}}]
      const entries = _args
        .filter(
          (arg): arg is Record<string, unknown> =>
            typeof arg === "object" && arg !== null
        )
        .reduce(
          (acc, arg) => ({
            ...acc,
            ...Object.entries(arg).reduce(
              (acc, [k, v]) => ({
                ...acc,
                // if v is an Error, JSON.stringify(v) returns "{}" so we need to extract the properties
                [k]:
                  v instanceof Error
                    ? {
                        name: v.name,
                        message: v.message,
                        details: { ...v },
                        stack: v.stack,
                      }
                    : v,
              }),
              {}
            ),
          }),
          { message: msg, severity }
        );

      return JSON.stringify(entries);
    };

    return {
      debug: (message: unknown, ...args: unknown[]) =>
        console.debug(
          formatGCloudMessage(category, "DEBUG", label, message, ...args)
        ),
      info: (message: unknown, ...args: unknown[]) =>
        console.info(
          formatGCloudMessage(category, "INFO", label, message, ...args)
        ),
      warn: (message: unknown, ...args: unknown[]) =>
        console.warn(
          formatGCloudMessage(category, "WARNING", label, message, ...args)
        ),
      error: (message: unknown, ...args: unknown[]) =>
        console.error(
          formatGCloudMessage(category, "ERROR", label, message, ...args)
        ),
    };
  };

const log4jsConfig: Configuration = {
  appenders: {
    console: {
      type: "console",
      layout: {
        // 本番環境は Cloud Run のためそのまま出力
        type: "colored",
      },
    },
    access: {
      type: "dateFile",
      filename: "log/access.log",
      pattern: ".yyyyMMdd-hhmmss",
      keepFileExt: true,
      numBackups: 5,
    },
    application: {
      type: "dateFile",
      filename: "log/application.log",
      pattern: ".yyyyMMdd-hhmmss",
      keepFileExt: true,
      numBackups: 5,
    },
  },
  categories: {
    default: {
      appenders: ["console"],
      level: "DEBUG",
    },
    infra: {
      appenders: ["console", "application"],
      level: "DEBUG",
      enableCallStack: true,
    },
    access: {
      appenders: ["console", "access"],
      level: "DEBUG",
      enableCallStack: true,
    },
    service: {
      appenders: ["console", "application"],
      level: "DEBUG",
      enableCallStack: true,
    },
  },
};
configure(log4jsConfig);

const localLogger = (category: string): LoggerBuilder => {
  const logger = getLogger(category.toLowerCase());

  return (label: string) => ({
    debug: (message: unknown, ...args: unknown[]) =>
      logger.debug(label, message, ...args),
    info: (message: unknown, ...args: unknown[]) =>
      logger.info(label, message, ...args),
    warn: (message: unknown, ...args: unknown[]) =>
      logger.warn(label, message, ...args),
    error: (message: unknown, ...args: unknown[]) =>
      logger.error(label, message, ...args),
  });
};

const logger = (category: string) =>
  env.NODE_ENV === "development"
    ? localLogger(category)
    : gcloudLogger(category);

export const infraLogger = logger("INFRA");
export const accessLogger = logger("ACCESS");
export const appLogger = logger("SERVICE");
