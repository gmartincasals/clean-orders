/**
 * Puerto: Reloj del sistema
 * Abstracción del tiempo para facilitar testing
 */
export interface Clock {
  /**
   * Obtiene la fecha y hora actual
   */
  now(): Date;

  /**
   * Obtiene el timestamp actual en milisegundos
   */
  timestamp(): number;
}
