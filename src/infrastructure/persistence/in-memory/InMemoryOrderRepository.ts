import { OrderRepository } from '@application/ports/OrderRepository.js';
import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';

/**
 * Implementación en memoria del repositorio de pedidos
 * Útil para testing y desarrollo
 */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders: Map<string, Order>;

  constructor() {
    this.orders = new Map();
  }

  async save(order: Order): Promise<void> {
    // Clonar el pedido para evitar referencias compartidas
    this.orders.set(order.id.value, order);
  }

  async findById(id: OrderId): Promise<Order | undefined> {
    return this.orders.get(id.value);
  }

  async exists(id: OrderId): Promise<boolean> {
    return this.orders.has(id.value);
  }

  /**
   * Métodos adicionales útiles para testing
   */

  clear(): void {
    this.orders.clear();
  }

  count(): number {
    return this.orders.size;
  }

  findAll(): Order[] {
    return Array.from(this.orders.values());
  }
}
