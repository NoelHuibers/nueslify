import process from "node:process";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env["LOG_LEVEL"] as Level | undefined) ?? "info"] ?? LEVELS.info;

/** Minimal structured logger: one JSON line per event, friendly to Vercel/Nitro log drains. */
function write(level: Level, message: string, fields?: Fields): void {
  if (LEVELS[level] < threshold || process.env["NODE_ENV"] === "test") {
    return;
  }
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error" || level === "warn") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

export const logger = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
