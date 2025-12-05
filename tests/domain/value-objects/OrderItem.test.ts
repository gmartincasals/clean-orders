import { OrderItem } from '@domain/value-objects/OrderItem.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Quantity } from '@domain/value-objects/Quantity.js';
import { MoneyBuilder } from '../builders/index.js';
import { describe, expect, it } from 'vitest';

describe('OrderItem Value Object', () => {
  describe('create', () => {
    it('should create a valid order item', () => {
      const productIdResult = ProductId.create('LAPTOP-001');
      const quantityResult = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const result = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.productId.value).toBe('LAPTOP-001');
          expect(result.value.quantity.value).toBe(2);
          expect(result.value.unitPrice.amount).toBe(999.99);
        }
      }
    });

    it('should create item with quantity of 1', () => {
      const productIdResult = ProductId.create('MOUSE-001');
      const quantityResult = Quantity.create(1);
      const price = MoneyBuilder.aMoney().withAmount(29.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const result = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.quantity.value).toBe(1);
        }
      }
    });

    it('should create item with large quantity', () => {
      const productIdResult = ProductId.create('CABLE-USB');
      const quantityResult = Quantity.create(1000);
      const price = MoneyBuilder.aMoney().withAmount(2.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const result = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.quantity.value).toBe(1000);
        }
      }
    });

    it('should create item with different currencies', () => {
      const productIdResult = ProductId.create('KEYBOARD-001');
      const quantityResult = Quantity.create(1);

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const currencies = ['USD', 'EUR', 'GBP'];

        currencies.forEach((currencyCode) => {
          const price = MoneyBuilder.aMoney().withAmount(99.99).withCurrency(currencyCode).build();
          const result = OrderItem.create(productIdResult.value, quantityResult.value, price);

          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value.unitPrice.currency.code).toBe(currencyCode);
          }
        });
      }
    });
  });

  describe('calculateSubtotal', () => {
    it('should calculate subtotal correctly', () => {
      const productIdResult = ProductId.create('LAPTOP-001');
      const quantityResult = Quantity.create(3);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const itemResult = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const subtotalResult = itemResult.value.calculateSubtotal();

          expect(subtotalResult.ok).toBe(true);
          if (subtotalResult.ok) {
            expect(subtotalResult.value.amount).toBeCloseTo(2999.97, 2);
            expect(subtotalResult.value.currency.code).toBe('USD');
          }
        }
      }
    });

    it('should calculate subtotal for quantity of 1', () => {
      const productIdResult = ProductId.create('MOUSE-001');
      const quantityResult = Quantity.create(1);
      const price = MoneyBuilder.aMoney().withAmount(49.99).inEUR().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const itemResult = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const subtotalResult = itemResult.value.calculateSubtotal();

          expect(subtotalResult.ok).toBe(true);
          if (subtotalResult.ok) {
            expect(subtotalResult.value.amount).toBe(49.99);
          }
        }
      }
    });

    it('should handle large quantities in subtotal', () => {
      const productIdResult = ProductId.create('STICKER-001');
      const quantityResult = Quantity.create(10000);
      const price = MoneyBuilder.aMoney().withAmount(0.50).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const itemResult = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const subtotalResult = itemResult.value.calculateSubtotal();

          expect(subtotalResult.ok).toBe(true);
          if (subtotalResult.ok) {
            expect(subtotalResult.value.amount).toBe(5000);
          }
        }
      }
    });

    it('should preserve currency in subtotal', () => {
      const productIdResult = ProductId.create('HEADPHONES-001');
      const quantityResult = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(79.99).inGBP().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const itemResult = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const subtotalResult = itemResult.value.calculateSubtotal();

          expect(subtotalResult.ok).toBe(true);
          if (subtotalResult.ok) {
            expect(subtotalResult.value.currency.code).toBe('GBP');
          }
        }
      }
    });
  });

  describe('increaseQuantity', () => {
    it('should increase quantity correctly', () => {
      const productIdResult = ProductId.create('LAPTOP-001');
      const initialQuantityResult = Quantity.create(2);
      const additionalQuantityResult = Quantity.create(3);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(initialQuantityResult.ok).toBe(true);
      expect(additionalQuantityResult.ok).toBe(true);

      if (productIdResult.ok && initialQuantityResult.ok && additionalQuantityResult.ok) {
        const itemResult = OrderItem.create(
          productIdResult.value,
          initialQuantityResult.value,
          price
        );

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const updatedItem = itemResult.value.increaseQuantity(additionalQuantityResult.value);

          expect(updatedItem.quantity.value).toBe(5);
          expect(updatedItem.productId.value).toBe('LAPTOP-001');
          expect(updatedItem.unitPrice.amount).toBe(999.99);
        }
      }
    });

    it('should maintain immutability when increasing quantity', () => {
      const productIdResult = ProductId.create('MOUSE-001');
      const initialQuantityResult = Quantity.create(5);
      const additionalQuantityResult = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(29.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(initialQuantityResult.ok).toBe(true);
      expect(additionalQuantityResult.ok).toBe(true);

      if (productIdResult.ok && initialQuantityResult.ok && additionalQuantityResult.ok) {
        const itemResult = OrderItem.create(
          productIdResult.value,
          initialQuantityResult.value,
          price
        );

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const originalItem = itemResult.value;
          const updatedItem = originalItem.increaseQuantity(additionalQuantityResult.value);

          // Original should remain unchanged
          expect(originalItem.quantity.value).toBe(5);
          // New item should have increased quantity
          expect(updatedItem.quantity.value).toBe(7);
        }
      }
    });

    it('should preserve product ID and price when increasing quantity', () => {
      const productIdResult = ProductId.create('KEYBOARD-MECH');
      const initialQuantityResult = Quantity.create(1);
      const additionalQuantityResult = Quantity.create(1);
      const price = MoneyBuilder.aMoney().withAmount(149.99).inEUR().build();

      expect(productIdResult.ok).toBe(true);
      expect(initialQuantityResult.ok).toBe(true);
      expect(additionalQuantityResult.ok).toBe(true);

      if (productIdResult.ok && initialQuantityResult.ok && additionalQuantityResult.ok) {
        const itemResult = OrderItem.create(
          productIdResult.value,
          initialQuantityResult.value,
          price
        );

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const updatedItem = itemResult.value.increaseQuantity(additionalQuantityResult.value);

          expect(updatedItem.productId.value).toBe('KEYBOARD-MECH');
          expect(updatedItem.unitPrice.amount).toBe(149.99);
          expect(updatedItem.unitPrice.currency.code).toBe('EUR');
        }
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical items', () => {
      const productIdResult = ProductId.create('LAPTOP-001');
      const quantityResult = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const item1Result = OrderItem.create(productIdResult.value, quantityResult.value, price);
        const item2Result = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(item1Result.ok).toBe(true);
        expect(item2Result.ok).toBe(true);

        if (item1Result.ok && item2Result.ok) {
          expect(item1Result.value.equals(item2Result.value)).toBe(true);
        }
      }
    });

    it('should return false for items with different product IDs', () => {
      const productId1Result = ProductId.create('LAPTOP-001');
      const productId2Result = ProductId.create('LAPTOP-002');
      const quantityResult = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productId1Result.ok).toBe(true);
      expect(productId2Result.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productId1Result.ok && productId2Result.ok && quantityResult.ok) {
        const item1Result = OrderItem.create(productId1Result.value, quantityResult.value, price);
        const item2Result = OrderItem.create(productId2Result.value, quantityResult.value, price);

        expect(item1Result.ok).toBe(true);
        expect(item2Result.ok).toBe(true);

        if (item1Result.ok && item2Result.ok) {
          expect(item1Result.value.equals(item2Result.value)).toBe(false);
        }
      }
    });

    it('should return false for items with different quantities', () => {
      const productIdResult = ProductId.create('MOUSE-001');
      const quantity1Result = Quantity.create(2);
      const quantity2Result = Quantity.create(3);
      const price = MoneyBuilder.aMoney().withAmount(29.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantity1Result.ok).toBe(true);
      expect(quantity2Result.ok).toBe(true);

      if (productIdResult.ok && quantity1Result.ok && quantity2Result.ok) {
        const item1Result = OrderItem.create(productIdResult.value, quantity1Result.value, price);
        const item2Result = OrderItem.create(productIdResult.value, quantity2Result.value, price);

        expect(item1Result.ok).toBe(true);
        expect(item2Result.ok).toBe(true);

        if (item1Result.ok && item2Result.ok) {
          expect(item1Result.value.equals(item2Result.value)).toBe(false);
        }
      }
    });

    it('should return false for items with different prices', () => {
      const productIdResult = ProductId.create('KEYBOARD-001');
      const quantityResult = Quantity.create(1);
      const price1 = MoneyBuilder.aMoney().withAmount(99.99).inUSD().build();
      const price2 = MoneyBuilder.aMoney().withAmount(129.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const item1Result = OrderItem.create(productIdResult.value, quantityResult.value, price1);
        const item2Result = OrderItem.create(productIdResult.value, quantityResult.value, price2);

        expect(item1Result.ok).toBe(true);
        expect(item2Result.ok).toBe(true);

        if (item1Result.ok && item2Result.ok) {
          expect(item1Result.value.equals(item2Result.value)).toBe(false);
        }
      }
    });
  });

  describe('toString', () => {
    it('should return a readable string representation', () => {
      const productIdResult = ProductId.create('LAPTOP-001');
      const quantityResult = Quantity.create(2);
      const price = MoneyBuilder.aMoney().withAmount(999.99).inUSD().build();

      expect(productIdResult.ok).toBe(true);
      expect(quantityResult.ok).toBe(true);

      if (productIdResult.ok && quantityResult.ok) {
        const itemResult = OrderItem.create(productIdResult.value, quantityResult.value, price);

        expect(itemResult.ok).toBe(true);
        if (itemResult.ok) {
          const str = itemResult.value.toString();
          expect(str).toContain('LAPTOP-001');
          expect(str).toContain('2');
          expect(str).toContain('999.99');
        }
      }
    });
  });
});
