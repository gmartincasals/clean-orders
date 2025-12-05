import { Logger } from '@application/ports/Logger.js';

/**
 * Spy Logger - Registra todos los logs sin imprimirlos
 * Útil para verificar que se loguean las operaciones correctas
 */
export class SpyLogger implements Logger {
  private logs: Array<{ level: string; message: string; context?: Record<string, unknown> }> = [];

  trace(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'trace', message, context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'debug', message, context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'info', message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'warn', message, context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'error', message, context });
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: 'fatal', message, context });
  }

  child(bindings: Record<string, unknown>): Logger {
    // Retorna una nueva instancia con los bindings
    const childLogger = new SpyLogger();
    childLogger.logs = this.logs; // Comparten los logs
    return childLogger;
  }

  // Métodos de inspección
  getLogs(): Array<{ level: string; message: string; context?: Record<string, unknown> }> {
    return [...this.logs];
  }

  getLogsByLevel(level: string): Array<{ message: string; context?: Record<string, unknown> }> {
    return this.logs.filter((log) => log.level === level);
  }

  getInfoLogs(): Array<{ message: string; context?: Record<string, unknown> }> {
    return this.getLogsByLevel('info');
  }

  getErrorLogs(): Array<{ message: string; context?: Record<string, unknown> }> {
    return this.getLogsByLevel('error');
  }

  getWarnLogs(): Array<{ message: string; context?: Record<string, unknown> }> {
    return this.getLogsByLevel('warn');
  }

  hasLoggedMessage(message: string): boolean {
    return this.logs.some((log) => log.message.includes(message));
  }

  hasLoggedError(message: string): boolean {
    return this.getErrorLogs().some((log) => log.message.includes(message));
  }

  clear(): void {
    this.logs = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }
}
