import { OrderId } from '../value-objects/OrderId.js';
import { ProductId } from '../value-objects/ProductId.js';
import { Quantity } from '../value-objects/Quantity.js';
import { DomainEvent } from './DomainEvent.js';

/**
 * Evento de dominio: OrderItemQuantityIncreased
 * Se emite cuando se incrementa la cantidad de un item existente
 */
export class OrderItemQuantityIncreased extends DomainEvent {
  static readonly EVENT_TYPE = 'order.item.quantity.increased';

  constructor(
    public readonly orderId: OrderId,
    public readonly productId: ProductId,
    public readonly previousQuantity: Quantity,
    public readonly newQuantity: Quantity
  ) {
    super(OrderItemQuantityIncreased.EVENT_TYPE);
  }

  toPrimitives(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt.toISOString(),
      data: {
        orderId: this.orderId.value,
        productId: this.productId.value,
        previousQuantity: this.previousQuantity.value,
        newQuantity: this.newQuantity.value,
      },
    };
  }
}
