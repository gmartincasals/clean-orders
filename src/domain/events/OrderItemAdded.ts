import { Money } from '../value-objects/Money.js';
import { OrderId } from '../value-objects/OrderId.js';
import { ProductId } from '../value-objects/ProductId.js';
import { Quantity } from '../value-objects/Quantity.js';
import { DomainEvent } from './DomainEvent.js';

/**
 * Evento de dominio: OrderItemAdded
 * Se emite cuando se agrega un item a un pedido
 */
export class OrderItemAdded extends DomainEvent {
  static readonly EVENT_TYPE = 'order.item.added';

  constructor(
    public readonly orderId: OrderId,
    public readonly productId: ProductId,
    public readonly quantity: Quantity,
    public readonly unitPrice: Money
  ) {
    super(OrderItemAdded.EVENT_TYPE);
  }

  toPrimitives(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt.toISOString(),
      data: {
        orderId: this.orderId.value,
        productId: this.productId.value,
        quantity: this.quantity.value,
        unitPrice: {
          amount: this.unitPrice.amount,
          currency: this.unitPrice.currency.code,
        },
      },
    };
  }
}
