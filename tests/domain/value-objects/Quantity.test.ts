import { Quantity } from '@domain/value-objects/Quantity.js';
import { describe, expect, it } from 'vitest';

describe('Quantity Value Object', () => {
  describe('create', () => {
    it('should create a valid quantity', () => {
      const result = Quantity.create(5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe(5);
      }
    });

    it('should accept quantity of 1', () => {
      const result = Quantity.create(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe(1);
      }
    });

    it('should accept large quantities', () => {
      const largeQuantities = [100, 1000, 9999, 1000000];

      largeQuantities.forEach((qty) => {
        const result = Quantity.create(qty);
        expect(result.ok).toBe(true);
      });
    });

    it('should fail when quantity is zero', () => {
      const result = Quantity.create(0);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser mayor que cero');
      }
    });

    it('should fail when quantity is negative', () => {
      const result = Quantity.create(-5);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser mayor que cero');
      }
    });

    it('should fail when quantity is a decimal number', () => {
      const result = Quantity.create(2.5);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser un número entero');
      }
    });

    it('should fail when quantity is a float with many decimals', () => {
      const result = Quantity.create(3.141592);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser un número entero');
      }
    });

    it('should fail when quantity is NaN', () => {
      const result = Quantity.create(NaN);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser un número entero');
      }
    });

    it('should fail when quantity is Infinity', () => {
      const result = Quantity.create(Infinity);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser un número entero');
      }
    });

    it('should fail when quantity is negative Infinity', () => {
      const result = Quantity.create(-Infinity);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('La cantidad debe ser un número entero');
      }
    });
  });

  describe('add', () => {
    it('should add two quantities', () => {
      const qty1Result = Quantity.create(5);
      const qty2Result = Quantity.create(3);

      expect(qty1Result.ok).toBe(true);
      expect(qty2Result.ok).toBe(true);

      if (qty1Result.ok && qty2Result.ok) {
        const sum = qty1Result.value.add(qty2Result.value);
        expect(sum.value).toBe(8);
      }
    });

    it('should add large quantities without overflow issues', () => {
      const qty1Result = Quantity.create(999999);
      const qty2Result = Quantity.create(1);

      expect(qty1Result.ok).toBe(true);
      expect(qty2Result.ok).toBe(true);

      if (qty1Result.ok && qty2Result.ok) {
        const sum = qty1Result.value.add(qty2Result.value);
        expect(sum.value).toBe(1000000);
      }
    });

    it('should maintain immutability when adding', () => {
      const qty1Result = Quantity.create(5);
      const qty2Result = Quantity.create(3);

      expect(qty1Result.ok).toBe(true);
      expect(qty2Result.ok).toBe(true);

      if (qty1Result.ok && qty2Result.ok) {
        qty1Result.value.add(qty2Result.value);

        // Original quantities should remain unchanged
        expect(qty1Result.value.value).toBe(5);
        expect(qty2Result.value.value).toBe(3);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal quantities', () => {
      const qty1Result = Quantity.create(10);
      const qty2Result = Quantity.create(10);

      expect(qty1Result.ok).toBe(true);
      expect(qty2Result.ok).toBe(true);

      if (qty1Result.ok && qty2Result.ok) {
        expect(qty1Result.value.equals(qty2Result.value)).toBe(true);
      }
    });

    it('should return false for different quantities', () => {
      const qty1Result = Quantity.create(10);
      const qty2Result = Quantity.create(20);

      expect(qty1Result.ok).toBe(true);
      expect(qty2Result.ok).toBe(true);

      if (qty1Result.ok && qty2Result.ok) {
        expect(qty1Result.value.equals(qty2Result.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the quantity as string', () => {
      const result = Quantity.create(42);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.toString()).toBe('42');
      }
    });
  });

  describe('value getter', () => {
    it('should return the internal value', () => {
      const result = Quantity.create(7);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe(7);
      }
    });
  });
});
