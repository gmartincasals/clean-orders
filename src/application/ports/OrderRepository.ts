import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';

/**
 * Puerto: Repositorio de pedidos
 * Define el contrato para persistir y recuperar pedidos
 */
export interface OrderRepository {
  /**
   * Guarda un pedido (nuevo o actualizado)
   */
  save(order: Order): Promise<void>;

  /**
   * Busca un pedido por su ID
   * @returns El pedido si existe, undefined si no
   */
  findById(id: OrderId): Promise<Order | undefined>;

  /**
   * Verifica si existe un pedido con el ID dado
   */
  exists(id: OrderId): Promise<boolean>;
}
