import { type DestinationStream, type Logger, pino } from "pino";

const logLevels = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

export type LogLevel = (typeof logLevels)[number];

function isLogLevel(value: string): value is LogLevel {
  return logLevels.some((candidate) => candidate === value);
}

export function readLogLevel(value: string | undefined): LogLevel {
  const level = value?.trim().toLowerCase() || "info";
  if (!isLogLevel(level)) {
    throw new Error(
      `LOG_LEVEL deve ser um destes valores: ${logLevels.join(", ")}.`
    );
  }
  return level;
}

export function createLogger(
  options: { service: string; level: LogLevel; pretty?: boolean },
  destination?: DestinationStream
): Logger {
  return pino(
    {
      level: options.level,
      base: { service: options.service },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(options.pretty && !destination
        ? {
            transport: {
              target: import.meta.resolve("pino-pretty"),
              options: {
                colorize: process.stdout.isTTY,
                ignore: "pid,hostname",
                translateTime: "SYS:standard",
              },
            },
          }
        : {}),
      redact: {
        paths: [
          "authorization",
          "cookie",
          "password",
          "secret",
          "token",
          "*.authorization",
          "*.cookie",
          "*.password",
          "*.secret",
          "*.token",
          "req.headers.authorization",
          "req.headers.cookie",
          "request.headers.authorization",
          "request.headers.cookie",
        ],
        censor: "[Redacted]",
      },
    },
    destination
  );
}

export type { Logger } from "pino";
