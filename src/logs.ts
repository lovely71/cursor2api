import { EventEmitter } from 'events';
import { format } from 'util';

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export type LogEntry = {
    id: number;
    ts: number;
    level: LogLevel;
    message: string;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const buffer: LogEntry[] = [];
const MAX_ENTRIES = 2000;
let nextId = 1;

let installed = false;

function append(level: LogLevel, message: string): LogEntry {
    const entry: LogEntry = {
        id: nextId++,
        ts: Date.now(),
        level,
        message: message.length > 20000 ? message.slice(0, 20000) + '…(truncated)' : message,
    };

    buffer.push(entry);
    if (buffer.length > MAX_ENTRIES) {
        buffer.splice(0, buffer.length - MAX_ENTRIES);
    }

    emitter.emit('log', entry);
    return entry;
}

export function getRecentLogs(limit: number): LogEntry[] {
    if (!Number.isFinite(limit) || limit <= 0) return [];
    return buffer.slice(-Math.min(limit, buffer.length));
}

export function getLogsSince(sinceId: number): LogEntry[] {
    if (!Number.isFinite(sinceId) || sinceId <= 0) return [...buffer];
    return buffer.filter(entry => entry.id > sinceId);
}

export function getLogStats(): { size: number; capacity: number; lastId: number } {
    const lastId = buffer.length > 0 ? buffer[buffer.length - 1].id : 0;
    return { size: buffer.length, capacity: MAX_ENTRIES, lastId };
}

export function clearLogs(): void {
    buffer.length = 0;
}

export function onLog(listener: (entry: LogEntry) => void): () => void {
    emitter.on('log', listener);
    return () => emitter.off('log', listener);
}

export function installConsoleCapture(): void {
    if (installed) return;
    installed = true;

    const original = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
    };

    const wrap = (level: LogLevel) => {
        const fn = original[level];
        return (...args: unknown[]) => {
            try {
                append(level, format(...(args as any[])));
            } catch {
                // ignore
            }
            fn(...(args as any[]));
        };
    };

    console.log = wrap('log');
    console.info = wrap('info');
    console.warn = wrap('warn');
    console.error = wrap('error');
    console.debug = wrap('debug');
}
