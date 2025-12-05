/**
 * Puerto: Logger
 * Define el contrato para el sistema de logging de la aplicación
 * Abstracción que permite cambiar la implementación de logging sin afectar la lógica de negocio
 */
export interface Logger {
  /**
   * Registra un mensaje de nivel TRACE (más detallado)
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional (opcional)
   */
  trace(message: string, context?: Record<string, unknown>): void;

  /**
   * Registra un mensaje de nivel DEBUG
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional (opcional)
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * Registra un mensaje de nivel INFO
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional (opcional)
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Registra un mensaje de nivel WARN
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional (opcional)
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Registra un mensaje de nivel ERROR
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional (error, stack trace, etc.)
   */
  error(message: string, context?: Record<string, unknown>): void;

  /**
   * Registra un mensaje de nivel FATAL (error crítico)
   * @param message - Mensaje a registrar
   * @param context - Contexto adicional (opcional)
   */
  fatal(message: string, context?: Record<string, unknown>): void;

  /**
   * Crea un logger hijo con contexto adicional
   * Útil para añadir contexto persistente (request ID, user ID, etc.)
   * @param bindings - Contexto que se añadirá a todos los logs del logger hijo
   */
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Niveles de log disponibles
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}
