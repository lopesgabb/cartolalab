/**
 * Structured Logger for CartolaLab
 * 
 * Outputs JSON-formatted logs with consistent fields for:
 * - Timestamp (ISO 8601)
 * - Log level (info, warn, error, debug)
 * - Component source
 * - Message
 * - Optional metadata
 * 
 * In production, these logs can be ingested by CloudWatch, Datadog, etc.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  meta?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level (configurable via env)
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

export function log(
  level: LogLevel,
  component: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Convenience wrappers
 */
export const logger = {
  debug: (component: string, msg: string, meta?: Record<string, unknown>) =>
    log('debug', component, msg, meta),
  info: (component: string, msg: string, meta?: Record<string, unknown>) =>
    log('info', component, msg, meta),
  warn: (component: string, msg: string, meta?: Record<string, unknown>) =>
    log('warn', component, msg, meta),
  error: (component: string, msg: string, meta?: Record<string, unknown>) =>
    log('error', component, msg, meta),
};

/**
 * Performance timer utility
 * Usage:
 *   const timer = startTimer();
 *   // ... do work ...
 *   logger.info('engine', 'Query completed', timer.elapsed());
 */
export function startTimer(): { elapsed: () => { durationMs: number } } {
  const start = performance.now();
  return {
    elapsed: () => ({ durationMs: Math.round(performance.now() - start) }),
  };
}
