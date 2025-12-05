import { Order } from '@domain/entities/Order.js';
import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Quantity } from '@domain/value-objects/Quantity.js';

/**
 * Builder para crear pedidos de prueba con datos variados
 * Permite generar "ruido" para hacer los tests más robustos
 */
export class OrderBuilder {
  private orderId?: OrderId;
  private items: Array<{ productId: ProductId; quantity: Quantity; price: Money }> = [];

  static aOrder(): OrderBuilder {
    return new OrderBuilder();
  }

  withId(id: string): OrderBuilder {
    const orderIdResult = OrderId.create(id);
    if (!orderIdResult.ok) throw new Error(`Invalid order ID: ${id}`);
    this.orderId = orderIdResult.value;
    return this;
  }

  withRandomId(): OrderBuilder {
    this.orderId = OrderId.generate();
    return this;
  }

  withItem(productId: string, quantity: number, price: number, currency = 'USD'): OrderBuilder {
    const productIdResult = ProductId.create(productId);
    const quantityResult = Quantity.create(quantity);
    const currencyResult = Currency.create(currency);

    if (!productIdResult.ok || !quantityResult.ok || !currencyResult.ok) {
      throw new Error('Invalid item parameters');
    }

    const priceResult = Money.create(price, currencyResult.value);
    if (!priceResult.ok) throw new Error('Invalid price');

    this.items.push({
      productId: productIdResult.value,
      quantity: quantityResult.value,
      price: priceResult.value,
    });

    return this;
  }

  withMultipleItems(count: number): OrderBuilder {
    const products = [
      'LAPTOP-X1',
      'MOUSE-M2',
      'KEYBOARD-K3',
      'MONITOR-4K',
      'WEBCAM-HD',
      'HEADSET-PRO',
      'DOCKING-STATION',
      'USB-HUB',
    ];

    const prices = [1299.99, 29.99, 89.99, 499.99, 149.99, 79.99, 199.99, 39.99];

    for (let i = 0; i < count; i++) {
      const productIndex = i % products.length;
      this.withItem(products[productIndex], i + 1, prices[productIndex]);
    }

    return this;
  }

  withLaptop(): OrderBuilder {
    return this.withItem('LAPTOP-DELL-XPS15', 1, 1899.99);
  }

  withMouse(quantity = 1): OrderBuilder {
    return this.withItem('MOUSE-LOGITECH-MX3', quantity, 99.99);
  }

  withKeyboard(): OrderBuilder {
    return this.withItem('KEYBOARD-MECHANICAL-RGB', 1, 159.99);
  }

  withExpensiveItems(): OrderBuilder {
    return this.withItem('MACBOOK-PRO-16', 1, 2999.99)
      .withItem('IPHONE-15-PRO', 2, 1199.99)
      .withItem('AIRPODS-MAX', 1, 549.99);
  }

  withCheapItems(): OrderBuilder {
    return this.withItem('USB-CABLE-C', 5, 9.99)
      .withItem('MOUSE-PAD', 2, 14.99)
      .withItem('CABLE-ORGANIZER', 3, 7.99);
  }

  build(): Order {
    const order = Order.create(this.orderId);

    // Limpiar eventos de creación si queremos solo los eventos de items
    order.pullDomainEvents();

    for (const item of this.items) {
      const result = order.addItem(item.productId, item.quantity, item.price);
      if (!result.ok) {
        throw new Error(`Failed to add item: ${result.error}`);
      }
    }

    return order;
  }

  buildEmpty(): Order {
    return Order.create(this.orderId);
  }
}
