export interface LogEntry {
  timestamp: string;
  toolName: string;
  args: unknown;
  result?: unknown;
}

export const logEntries: LogEntry[] = [];

type Listener = (entry: LogEntry) => void;
const listeners: Listener[] = [];

export function onLogEntry(listener: Listener): void {
  listeners.push(listener);
}

export function logToolCall(toolName: string, args: unknown, result?: unknown): void {
  const entry: LogEntry = {
    timestamp: new Date().toLocaleTimeString(),
    toolName,
    args,
    result,
  };
  logEntries.push(entry);
  for (const listener of listeners) listener(entry);
}
