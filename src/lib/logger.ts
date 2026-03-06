type LogLevel = "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...meta,
    };

    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
        const prefix = { info: "ℹ️", warn: "⚠️", error: "❌" }[level];
        console.log(`${prefix} [${entry.timestamp}] ${message}`, meta ? meta : "");
    } else {
        // Structured JSON for production (container log aggregation)
        const logLine = JSON.stringify(entry);
        if (level === "error") {
            console.error(logLine);
        } else {
            console.log(logLine);
        }
    }
}

export const logger = {
    info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
