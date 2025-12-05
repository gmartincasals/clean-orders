import { OrderRepository } from './OrderRepository.js';

/**
 * Puerto: Unit of Work
 * Define el contrato para una unidad de trabajo genérica,
 * que coordina transacciones y la persistencia de múltiples repositorios.
 */
export interface UnitOfWork {
  /**
   * Inicia una nueva transacción.
   */
  begin(): Promise<void>;

  /**
   * Confirma la transacción actual.
   */
  commit(): Promise<void>;

  /**
   * Revierte la transacción actual.
   */
  rollback(): Promise<void>;

  /**
   * Ejecuta una función dentro de una transacción.
   * Si la función tiene éxito, hace commit automáticamente.
   * Si falla, hace rollback automáticamente.
   * @param fn La función a ejecutar dentro de la transacción.
   * @returns El resultado de la función.
   */
  executeInTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T>;

  /**
   * Obtiene una instancia del repositorio de pedidos asociada a esta unidad de trabajo.
   * Esto asegura que todas las operaciones del repositorio se realicen dentro de la misma transacción.
   */
  getOrderRepository(): OrderRepository;

  /**
   * Cierra la unidad de trabajo y libera los recursos asociados.
   * Debe llamarse al finalizar el uso de la unidad de trabajo.
   */
  close(): Promise<void>;
}
