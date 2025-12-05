import { Result, ok } from '../../shared/Results.js';
import { ProductId } from './ProductId.js';
import { Quantity } from './Quantity.js';
import { Money } from './Money.js';

/**
 * Value Object: OrderItem
 * Representa un item dentro de un pedido
 * Invariantes:
 * - Debe tener un producto válido
 * - Debe tener una cantidad válida
 * - Debe tener un precio unitario válido
 */
export class OrderItem {
  private constructor(
    private readonly _productId: ProductId,
    private readonly _quantity: Quantity,
    private readonly _unitPrice: Money
  ) {}

  static create(
    productId: ProductId,
    quantity: Quantity,
    unitPrice: Money
  ): Result<OrderItem, string> {
    return ok(new OrderItem(productId, quantity, unitPrice));
  }

  get productId(): ProductId {
    return this._productId;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  /**
   * Calcula el subtotal del item (cantidad * precio unitario)
   */
  calculateSubtotal(): Result<Money, string> {
    return this._unitPrice.multiply(this._quantity.value);
  }

  /**
   * Incrementa la cantidad del item
   */
  increaseQuantity(additionalQuantity: Quantity): OrderItem {
    const newQuantity = this._quantity.add(additionalQuantity);
    return new OrderItem(this._productId, newQuantity, this._unitPrice);
  }

  equals(other: OrderItem): boolean {
    return (
      this._productId.equals(other._productId) &&
      this._quantity.equals(other._quantity) &&
      this._unitPrice.equals(other._unitPrice)
    );
  }

  toString(): string {
    const subtotalResult = this.calculateSubtotal();
    const subtotal = subtotalResult.ok ? subtotalResult.value.toString() : 'Error';
    return `${this._productId} x${this._quantity} @ ${this._unitPrice} = ${subtotal}`;
  }
}
