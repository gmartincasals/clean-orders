import { OrderId } from '../value-objects/OrderId.js';
import { DomainEvent } from './DomainEvent.js';

/**
 * Evento de dominio: OrderCreated
 * Se emite cuando se crea un nuevo pedido
 */
export class OrderCreated extends DomainEvent {
  static readonly EVENT_TYPE = 'order.created';

  constructor(public readonly orderId: OrderId) {
    super(OrderCreated.EVENT_TYPE);
  }

  toPrimitives(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt.toISOString(),
      data: {
        orderId: this.orderId.value,
      },
    };
  }
}
