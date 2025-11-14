import { Order } from '@domain/entities/Order.js';
import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Quantity } from '@domain/value-objects/Quantity.js';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Order Aggregate', () => {
  let testOrderId: OrderId;
  let testProductId: ProductId;
  let testQuantity: Quantity;
  let testPrice: Money;

  beforeEach(() => {
    const orderIdResult = OrderId.create('ORD-TEST-001');
    const productIdResult = ProductId.create('LAPTOP-001');
    const quantityResult = Quantity.create(2);
    const currencyResult = Currency.create('USD');

    if (!orderIdResult.ok || !productIdResult.ok || !quantityResult.ok || !currencyResult.ok) {
      throw new Error('Failed to create test fixtures');
    }

    testOrderId = orderIdResult.value;
    testProductId = productIdResult.value;
    testQuantity = quantityResult.value;

    const moneyResult = Money.create(100, currencyResult.value);
    if (!moneyResult.ok) {
      throw new Error('Failed to create test price');
    }
    testPrice = moneyResult.value;
  });

  describe('create', () => {
    it('should create a new empty order', () => {
      const order = Order.create(testOrderId);

      expect(order.id.value).toBe('ORD-TEST-001');
      expect(order.items.length).toBe(0);
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should generate a new order ID if not provided', () => {
      const order = Order.create();

      expect(order.id.value).toMatch(/^ORD-/);
      expect(order.items.length).toBe(0);
    });

    it('should record OrderCreated domain event', () => {
      const order = Order.create(testOrderId);
      const events = order.pullDomainEvents();

      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('OrderCreated');
    });
  });

  describe('addItem', () => {
    it('should add a new item to the order', () => {
      const order = Order.create(testOrderId);
      const result = order.addItem(testProductId, testQuantity, testPrice);

      expect(result.ok).toBe(true);
      expect(order.items.length).toBe(1);
      expect(order.items[0].productId.value).toBe('LAPTOP-001');
      expect(order.items[0].quantity.value).toBe(2);
    });

    it('should record OrderItemAdded domain event', () => {
      const order = Order.create(testOrderId);
      order.pullDomainEvents(); // Clear creation event

      order.addItem(testProductId, testQuantity, testPrice);
      const events = order.pullDomainEvents();

      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('OrderItemAdded');
    });

    it('should increment quantity if item already exists', () => {
      const order = Order.create(testOrderId);
      order.addItem(testProductId, testQuantity, testPrice);

      const quantityResult = Quantity.create(3);
      if (!quantityResult.ok) throw new Error('Failed to create quantity');

      const result = order.addItem(testProductId, quantityResult.value, testPrice);

      expect(result.ok).toBe(true);
      expect(order.items.length).toBe(1); // Still one item
      expect(order.items[0].quantity.value).toBe(5); // 2 + 3
    });

    it('should record OrderItemQuantityIncreased event when incrementing', () => {
      const order = Order.create(testOrderId);
      order.addItem(testProductId, testQuantity, testPrice);
      order.pullDomainEvents(); // Clear previous events

      const quantityResult = Quantity.create(3);
      if (!quantityResult.ok) throw new Error('Failed to create quantity');

      order.addItem(testProductId, quantityResult.value, testPrice);
      const events = order.pullDomainEvents();

      expect(events.length).toBe(1);
      expect(events[0].constructor.name).toBe('OrderItemQuantityIncreased');
    });

    it('should reject zero price', () => {
      const order = Order.create(testOrderId);
      const currencyResult = Currency.create('USD');
      if (!currencyResult.ok) throw new Error('Failed to create currency');

      const zeroPriceResult = Money.create(0, currencyResult.value);
      if (!zeroPriceResult.ok) throw new Error('Failed to create zero price');

      const result = order.addItem(testProductId, testQuantity, zeroPriceResult.value);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('no puede ser cero');
      }
    });

    it('should reject items with different currencies', () => {
      const order = Order.create(testOrderId);
      order.addItem(testProductId, testQuantity, testPrice); // USD

      const eurResult = Currency.create('EUR');
      if (!eurResult.ok) throw new Error('Failed to create EUR');

      const eurPriceResult = Money.create(100, eurResult.value);
      if (!eurPriceResult.ok) throw new Error('Failed to create EUR price');

      const productId2Result = ProductId.create('MOUSE-001');
      if (!productId2Result.ok) throw new Error('Failed to create product ID');

      const result = order.addItem(productId2Result.value, testQuantity, eurPriceResult.value);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('misma moneda');
      }
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total for a single item', () => {
      const order = Order.create(testOrderId);
      order.addItem(testProductId, testQuantity, testPrice);

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        expect(totalResult.value.amount).toBe(200); // 2 * 100
        expect(totalResult.value.currency.code).toBe('USD');
      }
    });

    it('should calculate total for multiple items', () => {
      const order = Order.create(testOrderId);

      const product1Result = ProductId.create('LAPTOP-001');
      const product2Result = ProductId.create('MOUSE-001');
      const quantity1Result = Quantity.create(2);
      const quantity2Result = Quantity.create(3);

      if (!product1Result.ok || !product2Result.ok || !quantity1Result.ok || !quantity2Result.ok) {
        throw new Error('Failed to create test data');
      }

      const currencyResult = Currency.create('USD');
      if (!currencyResult.ok) throw new Error('Failed to create currency');

      const price1Result = Money.create(100, currencyResult.value);
      const price2Result = Money.create(50, currencyResult.value);

      if (!price1Result.ok || !price2Result.ok) throw new Error('Failed to create prices');

      order.addItem(product1Result.value, quantity1Result.value, price1Result.value);
      order.addItem(product2Result.value, quantity2Result.value, price2Result.value);

      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        expect(totalResult.value.amount).toBe(350); // (2*100) + (3*50)
      }
    });

    it('should fail for empty order', () => {
      const order = Order.create(testOrderId);
      const totalResult = order.calculateTotal();

      expect(totalResult.ok).toBe(false);
      if (!totalResult.ok) {
        expect(totalResult.error).toContain('no tiene items');
      }
    });
  });

  describe('pullDomainEvents', () => {
    it('should return domain events and clear them', () => {
      const order = Order.create(testOrderId);
      order.addItem(testProductId, testQuantity, testPrice);

      const events1 = order.pullDomainEvents();
      expect(events1.length).toBe(2); // OrderCreated + OrderItemAdded

      const events2 = order.pullDomainEvents();
      expect(events2.length).toBe(0); // Already pulled
    });
  });
});
