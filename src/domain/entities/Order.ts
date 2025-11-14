import { Result, ok, fail } from '../../shared/Results.js';
import { OrderId } from '../value-objects/OrderId.js';
import { OrderItem } from '../value-objects/OrderItem.js';
import { Money } from '../value-objects/Money.js';
import { ProductId } from '../value-objects/ProductId.js';
import { Quantity } from '../value-objects/Quantity.js';
import { DomainEvent } from '../events/DomainEvent.js';
import { OrderCreated } from '../events/OrderCreated.js';
import { OrderItemAdded } from '../events/OrderItemAdded.js';
import { OrderItemQuantityIncreased } from '../events/OrderItemQuantityIncreased.js';

/**
 * Aggregate Root: Order
 * Representa un pedido completo con sus items
 * Invariantes:
 * - Un pedido debe tener un ID único
 * - Los items deben tener la misma moneda
 * - No se pueden agregar items con precio cero
 */
export class Order {
  private readonly _id: OrderId;
  private readonly _items: Map<string, OrderItem>;
  private readonly _domainEvents: DomainEvent[];
  private readonly _createdAt: Date;

  private constructor(id: OrderId, items: OrderItem[] = []) {
    this._id = id;
    this._items = new Map();
    this._domainEvents = [];
    this._createdAt = new Date();

    items.forEach((item) => {
      this._items.set(item.productId.value, item);
    });
  }

  /**
   * Factory method para crear un nuevo pedido
   */
  static create(id?: OrderId): Order {
    const orderId = id ?? OrderId.generate();
    const order = new Order(orderId);
    order.recordEvent(new OrderCreated(orderId));
    return order;
  }

  /**
   * Factory method para reconstituir un pedido desde persistencia
   */
  static reconstitute(id: OrderId, items: OrderItem[]): Order {
    return new Order(id, items);
  }

  get id(): OrderId {
    return this._id;
  }

  get items(): ReadonlyArray<OrderItem> {
    return Array.from(this._items.values());
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Agrega un item al pedido o incrementa la cantidad si ya existe
   */
  addItem(productId: ProductId, quantity: Quantity, unitPrice: Money): Result<void, string> {
    // Validar que el precio no sea cero
    if (unitPrice.amount === 0) {
      return fail('El precio unitario no puede ser cero');
    }

    // Validar coherencia de moneda si ya hay items
    if (this._items.size > 0) {
      const firstItem = this._items.values().next().value as OrderItem;
      if (!firstItem.unitPrice.hasSameCurrency(unitPrice)) {
        return fail(
          `Todos los items deben tener la misma moneda. Moneda esperada: ${firstItem.unitPrice.currency.code}`
        );
      }
    }

    const existingItem = this._items.get(productId.value);

    if (existingItem) {
      // Si el item ya existe, incrementar cantidad
      const previousQuantity = existingItem.quantity;
      const updatedItem = existingItem.increaseQuantity(quantity);
      this._items.set(productId.value, updatedItem);

      this.recordEvent(
        new OrderItemQuantityIncreased(this._id, productId, previousQuantity, updatedItem.quantity)
      );
    } else {
      // Crear nuevo item
      const itemResult = OrderItem.create(productId, quantity, unitPrice);
      if (!itemResult.ok) {
        return fail(itemResult.error);
      }

      this._items.set(productId.value, itemResult.value);
      this.recordEvent(new OrderItemAdded(this._id, productId, quantity, unitPrice));
    }

    return ok(undefined);
  }

  /**
   * Calcula el total del pedido agrupado por moneda
   */
  calculateTotalsByCurrency(): Map<string, Money> {
    const totals = new Map<string, Money>();

    for (const item of this._items.values()) {
      const subtotalResult = item.calculateSubtotal();
      if (!subtotalResult.ok) {
        continue; // Saltar items con errores de cálculo
      }

      const subtotal = subtotalResult.value;
      const currencyCode = subtotal.currency.code;
      const existingTotal = totals.get(currencyCode);

      if (existingTotal) {
        const newTotalResult = existingTotal.add(subtotal);
        if (newTotalResult.ok) {
          totals.set(currencyCode, newTotalResult.value);
        }
      } else {
        totals.set(currencyCode, subtotal);
      }
    }

    return totals;
  }

  /**
   * Calcula el total del pedido (asume una sola moneda)
   */
  calculateTotal(): Result<Money, string> {
    if (this._items.size === 0) {
      return fail('El pedido no tiene items');
    }

    const totals = this.calculateTotalsByCurrency();

    if (totals.size > 1) {
      return fail('El pedido contiene múltiples monedas');
    }

    const total = totals.values().next().value as Money;
    return ok(total);
  }

  /**
   * Obtiene el número de items diferentes en el pedido
   */
  get itemCount(): number {
    return this._items.size;
  }

  /**
   * Obtiene la cantidad total de productos en el pedido
   */
  getTotalQuantity(): number {
    return Array.from(this._items.values()).reduce((total, item) => total + item.quantity.value, 0);
  }

  /**
   * Verifica si el pedido contiene un producto específico
   */
  hasProduct(productId: ProductId): boolean {
    return this._items.has(productId.value);
  }

  /**
   * Obtiene los eventos de dominio no confirmados
   */
  pullDomainEvents(): DomainEvent[] {
    return this._domainEvents.splice(0, this._domainEvents.length);
  }

  private recordEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
}
