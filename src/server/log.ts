export type LogLevel = "info" | "warn" | "error";

/** Logs a structured, greppable event as a single JSON line at the given level. */
export function log(
    event: string,
    data: Record<string, unknown> = {},
    level: LogLevel = "info",
): void {
    const line = JSON.stringify({ event, ...data, level });
    if (level === "warn") {
        console.warn(line);
    } else if (level === "error") {
        console.error(line);
    } else {
        console.log(line);
    }
}
