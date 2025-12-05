import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { OrderRepository } from '@application/ports/OrderRepository.js';

/**
 * Fake OrderRepository - Implementación en memoria con comportamiento real
 * Incluye contadores para verificación en tests
 */
export class FakeOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();
  private saveCalls: number = 0;
  private findByIdCalls: number = 0;
  private existsCalls: number = 0;
  private shouldFailOnSave: boolean = false;
  private shouldFailOnFind: boolean = false;

  async save(order: Order): Promise<void> {
    this.saveCalls++;

    if (this.shouldFailOnSave) {
      throw new Error('Repository error: Failed to save order');
    }

    this.orders.set(order.id.value, order);
  }

  async findById(orderId: OrderId): Promise<Order | undefined> {
    this.findByIdCalls++;

    if (this.shouldFailOnFind) {
      throw new Error('Repository error: Failed to find order');
    }

    return this.orders.get(orderId.value);
  }

  async exists(orderId: OrderId): Promise<boolean> {
    this.existsCalls++;
    return this.orders.has(orderId.value);
  }

  // Métodos de utilidad para tests
  count(): number {
    return this.orders.size;
  }

  findAll(): Order[] {
    return Array.from(this.orders.values());
  }

  clear(): void {
    this.orders.clear();
    this.saveCalls = 0;
    this.findByIdCalls = 0;
    this.existsCalls = 0;
    this.shouldFailOnSave = false;
    this.shouldFailOnFind = false;
  }

  // Métodos para simular fallos
  simulateSaveFailure(): void {
    this.shouldFailOnSave = true;
  }

  simulateFindFailure(): void {
    this.shouldFailOnFind = true;
  }

  // Métodos de inspección
  getSaveCalls(): number {
    return this.saveCalls;
  }

  getFindByIdCalls(): number {
    return this.findByIdCalls;
  }

  getExistsCalls(): number {
    return this.existsCalls;
  }

  wasSaved(orderId: string): boolean {
    return this.orders.has(orderId);
  }
}
