import { Logger, LogLevel } from '@application/ports/Logger.js';

/**
 * Implementación simple de Logger usando console
 * Útil para testing y ambientes donde no se necesita logging estructurado
 */
export class ConsoleLogger implements Logger {
  private bindings: Record<string, unknown> = {};

  constructor(
    private readonly minLevel: LogLevel = LogLevel.INFO,
    bindings?: Record<string, unknown>
  ) {
    if (bindings) {
      this.bindings = bindings;
    }
  }

  trace(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      this.log('TRACE', message, context);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('WARN', message, context);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log('ERROR', message, context);
    }
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      this.log('FATAL', message, context);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger(this.minLevel, { ...this.bindings, ...bindings });
  }

  private log(level: string, message: string, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.bindings, ...context };
    const contextStr = Object.keys(mergedContext).length > 0 ? JSON.stringify(mergedContext) : '';

    const logMessage = `[${timestamp}] ${level}: ${message} ${contextStr}`;

    switch (level) {
      case 'ERROR':
      case 'FATAL':
        console.error(logMessage);
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.TRACE,
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL,
    ];

    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);

    return currentLevelIndex >= minLevelIndex;
  }
}
