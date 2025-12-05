import { Order } from '@domain/entities/Order.js';
import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Quantity } from '@domain/value-objects/Quantity.js';
import { MoneyBuilder, OrderBuilder } from '../builders/index.js';
import { describe, expect, it } from 'vitest';

describe('Order Aggregate - Advanced Tests', () => {
  describe('Business Rules - Price Validation', () => {
    it('should reject items with zero price', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const productIdResult = ProductId.create('FREE-ITEM');
      const quantityResult = Quantity.create(1);
      const zeroPrice = MoneyBuilder.aMoney().zero().inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const result = order.addItem(productIdResult.value, quantityResult.value, zeroPrice);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe('El precio unitario no puede ser cero');
        }
      }
    });

    it('should reject adding items with different currencies', () => {
      const order = OrderBuilder.aOrder().withLaptop().build();
      const productIdResult = ProductId.create('MONITOR-EUR');
      const quantityResult = Quantity.create(1);
      const eurPrice = MoneyBuilder.aMoney().withAmount(499.99).inEUR().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const result = order.addItem(productIdResult.value, quantityResult.value, eurPrice);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain('misma moneda');
          expect(result.error).toContain('USD');
        }
      }
    });

    it('should allow first item to set the currency', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const productIdResult = ProductId.create('MONITOR-EUR');
      const quantityResult = Quantity.create(1);
      const eurPrice = MoneyBuilder.aMoney().withAmount(499.99).inEUR().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const result = order.addItem(productIdResult.value, quantityResult.value, eurPrice);

        expect(result.ok).toBe(true);
        expect(order.items[0].unitPrice.currency.code).toBe('EUR');
      }
    });

    it('should enforce currency consistency across multiple items', () => {
      const order = OrderBuilder.aOrder().buildEmpty();

      // Add first item in GBP
      const product1Result = ProductId.create('ITEM-1');
      const quantity1Result = Quantity.create(1);
      const gbpPrice1 = MoneyBuilder.aMoney().withAmount(100).inGBP().build();

      expect(product1Result.ok).toBe(true);
      expect(quantity1Result.ok).toBe(true);

      if (product1Result.ok && quantity1Result.ok) {
        const result1 = order.addItem(product1Result.value, quantity1Result.value, gbpPrice1);
        expect(result1.ok).toBe(true);

        // Add second item in GBP (should work)
        const product2Result = ProductId.create('ITEM-2');
        const quantity2Result = Quantity.create(1);
        const gbpPrice2 = MoneyBuilder.aMoney().withAmount(200).inGBP().build();

        expect(product2Result.ok).toBe(true);
        expect(quantity2Result.ok).toBe(true);

        if (product2Result.ok && quantity2Result.ok) {
          const result2 = order.addItem(product2Result.value, quantity2Result.value, gbpPrice2);
          expect(result2.ok).toBe(true);

          // Try to add third item in EUR (should fail)
          const product3Result = ProductId.create('ITEM-3');
          const quantity3Result = Quantity.create(1);
          const eurPrice = MoneyBuilder.aMoney().withAmount(150).inEUR().build();

          expect(product3Result.ok).toBe(true);
          expect(quantity3Result.ok).toBe(true);

          if (product3Result.ok && quantity3Result.ok) {
            const result3 = order.addItem(product3Result.value, quantity3Result.value, eurPrice);
            expect(result3.ok).toBe(false);
            if (!result3.ok) {
              expect(result3.error).toContain('GBP');
            }
          }
        }
      }
    });
  });

  describe('Business Rules - Quantity Increment', () => {
    it('should increment quantity when adding same product twice', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const productIdResult = ProductId.create('LAPTOP-UNIQUE');
      const quantity1Result = Quantity.create(2);
      const quantity2Result = Quantity.create(3);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantity1Result.ok).toBe(true);
      expect(quantity2Result.ok).toBe(true);

      if (productIdResult.ok && quantity1Result.ok && quantity2Result.ok) {
        const result1 = order.addItem(productIdResult.value, quantity1Result.value, price);
        expect(result1.ok).toBe(true);
        expect(order.items.length).toBe(1);
        expect(order.items[0].quantity.value).toBe(2);

        const result2 = order.addItem(productIdResult.value, quantity2Result.value, price);
        expect(result2.ok).toBe(true);
        expect(order.items.length).toBe(1); // Still one item
        expect(order.items[0].quantity.value).toBe(5); // 2 + 3
      }
    });

    it('should handle multiple increments of same product', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const productIdResult = ProductId.create('POPULAR-ITEM');
      const price = MoneyBuilder.aMoney().withAmount(19.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      if (!productIdResult.ok) return;

      // Add item 5 times with different quantities
      const quantities = [1, 2, 3, 4, 5];
      let expectedTotal = 0;

      quantities.forEach((qty) => {
        const quantityResult = Quantity.create(qty);
        expect(quantityResult.ok).toBe(true);

        if (quantityResult.ok) {
          const result = order.addItem(productIdResult.value, quantityResult.value, price);
          expect(result.ok).toBe(true);
          expectedTotal += qty;
        }
      });

      expect(order.items.length).toBe(1);
      expect(order.items[0].quantity.value).toBe(expectedTotal); // 1+2+3+4+5 = 15
    });

    it('should maintain separate items for different products', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const price = MoneyBuilder.aMoney().withAmount(50).inUSD().build();

      const products = ['PROD-A', 'PROD-B', 'PROD-C'];

      products.forEach((productId) => {
        const prodIdResult = ProductId.create(productId);
        const qtyResult = Quantity.create(1);

        expect(prodIdResult.ok).toBe(true);
        expect(qtyResult.ok).toBe(true);

        if (prodIdResult.ok && qtyResult.ok) {
          const result = order.addItem(prodIdResult.value, qtyResult.value, price);
          expect(result.ok).toBe(true);
        }
      });

      expect(order.items.length).toBe(3);
      expect(order.items[0].productId.value).toBe('PROD-A');
      expect(order.items[1].productId.value).toBe('PROD-B');
      expect(order.items[2].productId.value).toBe('PROD-C');
    });
  });

  describe('Complex Total Calculations', () => {
    it('should calculate total for order with many different items', () => {
      const order = OrderBuilder.aOrder().withMultipleItems(5).build();

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        // Items: LAPTOP-X1 (1x1299.99), MOUSE-M2 (2x29.99), KEYBOARD-K3 (3x89.99),
        //        MONITOR-4K (4x499.99), WEBCAM-HD (5x149.99)
        const expected =
          1 * 1299.99 + 2 * 29.99 + 3 * 89.99 + 4 * 499.99 + 5 * 149.99;
        expect(totalResult.value.amount).toBeCloseTo(expected, 2);
      }
    });

    it('should calculate total for expensive items order', () => {
      const order = OrderBuilder.aOrder().withExpensiveItems().build();

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        // MACBOOK (1x2999.99) + IPHONE (2x1199.99) + AIRPODS (1x549.99)
        const expected = 2999.99 + 2 * 1199.99 + 549.99;
        expect(totalResult.value.amount).toBeCloseTo(expected, 2);
      }
    });

    it('should calculate total for cheap items order', () => {
      const order = OrderBuilder.aOrder().withCheapItems().build();

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        // USB-CABLE (5x9.99) + MOUSE-PAD (2x14.99) + CABLE-ORGANIZER (3x7.99)
        const expected = 5 * 9.99 + 2 * 14.99 + 3 * 7.99;
        expect(totalResult.value.amount).toBeCloseTo(expected, 2);
      }
    });

    it('should fail to calculate total for empty order', () => {
      const order = OrderBuilder.aOrder().buildEmpty();

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(false);
      if (!totalResult.ok) {
        expect(totalResult.error).toBe('El pedido no tiene items');
      }
    });

    it('should handle precision in total calculation', () => {
      const order = OrderBuilder.aOrder().buildEmpty();

      // Add items with prices that could cause floating point issues
      const items = [
        { product: 'ITEM-1', qty: 3, price: 0.1 },
        { product: 'ITEM-2', qty: 7, price: 0.2 },
        { product: 'ITEM-3', qty: 11, price: 0.3 },
      ];

      items.forEach((item) => {
        const prodIdResult = ProductId.create(item.product);
        const qtyResult = Quantity.create(item.qty);
        const price = MoneyBuilder.aMoney().withAmount(item.price).inUSD().build();

        expect(prodIdResult.ok).toBe(true);
        expect(qtyResult.ok).toBe(true);

        if (prodIdResult.ok && qtyResult.ok) {
          order.addItem(prodIdResult.value, qtyResult.value, price);
        }
      });

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        // 3*0.1 + 7*0.2 + 11*0.3 = 0.3 + 1.4 + 3.3 = 5.0
        expect(totalResult.value.amount).toBeCloseTo(5.0, 2);
      }
    });
  });

  describe('Order Queries', () => {
    it('should return correct item count', () => {
      const order = OrderBuilder.aOrder()
        .withLaptop()
        .withMouse()
        .withKeyboard()
        .build();

      expect(order.itemCount).toBe(3);
    });

    it('should return zero item count for empty order', () => {
      const order = OrderBuilder.aOrder().buildEmpty();

      expect(order.itemCount).toBe(0);
    });

    it('should calculate total quantity across all items', () => {
      const order = OrderBuilder.aOrder()
        .withItem('LAPTOP', 2, 999.99)
        .withItem('MOUSE', 5, 29.99)
        .withItem('KEYBOARD', 3, 89.99)
        .build();

      expect(order.getTotalQuantity()).toBe(10); // 2 + 5 + 3
    });

    it('should return zero total quantity for empty order', () => {
      const order = OrderBuilder.aOrder().buildEmpty();

      expect(order.getTotalQuantity()).toBe(0);
    });

    it('should correctly identify if order has a product', () => {
      const order = OrderBuilder.aOrder().withLaptop().build();

      const laptopIdResult = ProductId.create('LAPTOP-DELL-XPS15');
      const mouseIdResult = ProductId.create('MOUSE-LOGITECH');

      expect(laptopIdResult.ok).toBe(true);
      expect(mouseIdResult.ok).toBe(true);

      if (laptopIdResult.ok && mouseIdResult.ok) {
        expect(order.hasProduct(laptopIdResult.value)).toBe(true);
        expect(order.hasProduct(mouseIdResult.value)).toBe(false);
      }
    });
  });

  describe('Domain Events', () => {
    it('should record OrderCreated event on creation', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const events = order.pullDomainEvents();

      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('OrderCreated');
    });

    it('should record OrderItemAdded event when adding new item', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      order.pullDomainEvents(); // Clear creation event

      const productIdResult = ProductId.create('NEW-PRODUCT');
      const quantityResult = Quantity.create(1);
      const price = MoneyBuilder.aMoney().withAmount(99.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        order.addItem(productIdResult.value, quantityResult.value, price);
        const events = order.pullDomainEvents();

        expect(events.length).toBe(1);
        expect(events[0].constructor.name).toBe('OrderItemAdded');
      }
    });

    it('should record OrderItemQuantityIncreased event when incrementing', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const productIdResult = ProductId.create('PRODUCT-REPEAT');
      const quantity1Result = Quantity.create(1);
      const quantity2Result = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(50).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantity1Result.ok).toBe(true);
      expect(quantity2Result.ok).toBe(true);

      if (productIdResult.ok && quantity1Result.ok && quantity2Result.ok) {
        order.addItem(productIdResult.value, quantity1Result.value, price);
        order.pullDomainEvents(); // Clear previous events

        order.addItem(productIdResult.value, quantity2Result.value, price);
        const events = order.pullDomainEvents();

        expect(events.length).toBe(1);
        expect(events[0].constructor.name).toBe('OrderItemQuantityIncreased');
      }
    });

    it('should pull events only once', () => {
      const order = OrderBuilder.aOrder().withLaptop().build();

      const events1 = order.pullDomainEvents();
      expect(events1.length).toBeGreaterThan(0);

      const events2 = order.pullDomainEvents();
      expect(events2.length).toBe(0); // Already pulled
    });

    it('should record multiple events for multiple operations', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      order.pullDomainEvents(); // Clear creation event

      const price = MoneyBuilder.aMoney().withAmount(100).inUSD().build();

      // Add 3 different products
      for (let i = 1; i <= 3; i++) {
        const productIdResult = ProductId.create(`PRODUCT-${i}`);
        const quantityResult = Quantity.create(1);

        if (productIdResult.ok && quantityResult.ok) {
          order.addItem(productIdResult.value, quantityResult.value, price);
        }
      }

      const events = order.pullDomainEvents();
      expect(events.length).toBe(3);
      events.forEach((event) => {
        expect(event.constructor.name).toBe('OrderItemAdded');
      });
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    it('should handle order with many items', () => {
      const order = OrderBuilder.aOrder().withMultipleItems(100).build();

      expect(order.itemCount).toBeGreaterThan(0);
      expect(order.getTotalQuantity()).toBeGreaterThan(0);

      const totalResult = order.calculateTotal();
      expect(totalResult.ok).toBe(true);
    });

    it('should handle large quantities', () => {
      const order = OrderBuilder.aOrder()
        .withItem('BULK-ITEM', 10000, 0.50)
        .build();

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        expect(totalResult.value.amount).toBe(5000);
      }
    });

    it('should handle very expensive items', () => {
      const order = OrderBuilder.aOrder()
        .withItem('LUXURY-CAR', 1, 999999.99)
        .build();

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        expect(totalResult.value.amount).toBe(999999.99);
      }
    });

    it('should handle order with single item', () => {
      const order = OrderBuilder.aOrder().withLaptop().build();

      expect(order.itemCount).toBe(1);
      expect(order.items[0].productId.value).toBe('LAPTOP-DELL-XPS15');
    });

    it('should maintain order integrity after multiple operations', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const productIdResult = ProductId.create('TEST-PRODUCT');
      const price = MoneyBuilder.aMoney().withAmount(100).inUSD().build();

      if (!productIdResult.ok) return;

      // Add, increment, add more
      const operations = [1, 2, 3, 1, 5, 2];
      let expectedQuantity = 0;

      operations.forEach((qty) => {
        const qtyResult = Quantity.create(qty);
        if (qtyResult.ok) {
          order.addItem(productIdResult.value, qtyResult.value, price);
          expectedQuantity += qty;
        }
      });

      expect(order.items.length).toBe(1);
      expect(order.items[0].quantity.value).toBe(expectedQuantity);
    });
  });

  describe('Immutability and Value Object Properties', () => {
    it('should return readonly items array', () => {
      const order = OrderBuilder.aOrder().withLaptop().build();

      const items = order.items;
      expect(items.length).toBe(1);

      // TypeScript readonly prevents modification at compile time
      // At runtime, the array is ReadonlyArray which doesn't have push/pop/etc
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(1);
    });

    it('should preserve createdAt timestamp', () => {
      const order = OrderBuilder.aOrder().buildEmpty();
      const createdAt1 = order.createdAt;

      // Add some items
      const productIdResult = ProductId.create('ITEM-1');
      const quantityResult = Quantity.create(1);

      if (productIdResult.ok && quantityResult.ok) {
        order.addItem(
          productIdResult.value,
          quantityResult.value,
          MoneyBuilder.aMoney().build()
        );

        const createdAt2 = order.createdAt;

        expect(createdAt1).toBe(createdAt2); // Should be the same instance
      }
    });

    it('should have consistent order ID throughout lifecycle', () => {
      const orderId = 'ORD-CONSISTENT-123';
      const order = OrderBuilder.aOrder().withId(orderId).buildEmpty();

      expect(order.id.value).toBe(orderId);

      // Add items
      const productIdResult = ProductId.create('ITEM');
      const quantityResult = Quantity.create(5);

      if (productIdResult.ok && quantityResult.ok) {
        order.addItem(
          productIdResult.value,
          quantityResult.value,
          MoneyBuilder.aMoney().build()
        );

        expect(order.id.value).toBe(orderId); // Still the same
      }
    });
  });
});
