import { Logger } from '@application/ports/Logger.js';

/**
 * Implementación no-op (No Operation) del Logger
 * No realiza ninguna acción, útil para testing donde no se necesita logging
 */
export class NoopLogger implements Logger {
  trace(_message: string, _context?: Record<string, unknown>): void {
    // No-op
  }

  debug(_message: string, _context?: Record<string, unknown>): void {
    // No-op
  }

  info(_message: string, _context?: Record<string, unknown>): void {
    // No-op
  }

  warn(_message: string, _context?: Record<string, unknown>): void {
    // No-op
  }

  error(_message: string, _context?: Record<string, unknown>): void {
    // No-op
  }

  fatal(_message: string, _context?: Record<string, unknown>): void {
    // No-op
  }

  child(_bindings: Record<string, unknown>): Logger {
    return new NoopLogger();
  }
}
