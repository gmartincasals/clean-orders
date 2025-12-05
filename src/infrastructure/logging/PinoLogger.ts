import { Logger, LogLevel } from '@application/ports/Logger.js';
import pino from 'pino';

/**
 * Adaptador de Pino para la interfaz Logger
 * Implementa el puerto Logger usando la librería Pino
 */
export class PinoLogger implements Logger {
  constructor(private readonly pinoInstance: pino.Logger) {}

  trace(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.trace(context, message);
    } else {
      this.pinoInstance.trace(message);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.debug(context, message);
    } else {
      this.pinoInstance.debug(message);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.info(context, message);
    } else {
      this.pinoInstance.info(message);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.warn(context, message);
    } else {
      this.pinoInstance.warn(message);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.error(context, message);
    } else {
      this.pinoInstance.error(message);
    }
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.pinoInstance.fatal(context, message);
    } else {
      this.pinoInstance.fatal(message);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    return new PinoLogger(this.pinoInstance.child(bindings));
  }
}

/**
 * Configuración para crear un logger
 */
export interface LoggerConfig {
  level?: LogLevel;
  prettyPrint?: boolean;
  name?: string;
  base?: Record<string, unknown>;
}

/**
 * Factory para crear instancias de PinoLogger
 */
export class LoggerFactory {
  private static defaultLogger: Logger | null = null;

  /**
   * Crea un logger con la configuración especificada
   */
  static create(config: LoggerConfig = {}): Logger {
    const pinoConfig: pino.LoggerOptions = {
      level: config.level ?? LogLevel.INFO,
      name: config.name,
      base: config.base,
    };

    const transport = config.prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined;

    const pinoInstance = pino({
      ...pinoConfig,
      transport,
    });

    return new PinoLogger(pinoInstance);
  }

  /**
   * Obtiene o crea el logger por defecto
   */
  static getDefault(): Logger {
    if (!LoggerFactory.defaultLogger) {
      LoggerFactory.defaultLogger = LoggerFactory.create({
        level: (process.env.LOG_LEVEL as LogLevel) ?? LogLevel.INFO,
        prettyPrint: process.env.NODE_ENV !== 'production',
        name: 'clean-orders',
      });
    }
    return LoggerFactory.defaultLogger;
  }

  /**
   * Resetea el logger por defecto (útil para testing)
   */
  static reset(): void {
    LoggerFactory.defaultLogger = null;
  }
}
