import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';
import { describe, expect, it } from 'vitest';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create a valid Money instance', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(100, currencyResult.value);
      expect(moneyResult.ok).toBe(true);

      if (moneyResult.ok) {
        expect(moneyResult.value.amount).toBe(100);
        expect(moneyResult.value.currency.code).toBe('USD');
      }
    });

    it('should reject negative amounts', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(-10, currencyResult.value);
      expect(moneyResult.ok).toBe(false);

      if (!moneyResult.ok) {
        expect(moneyResult.error).toContain('no puede ser negativo');
      }
    });

    it('should reject invalid amounts', () => {
      const currencyResult = Currency.create('EUR');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(NaN, currencyResult.value);
      expect(moneyResult.ok).toBe(false);

      if (!moneyResult.ok) {
        expect(moneyResult.error).toContain('número válido');
      }
    });

    it('should accept zero amount', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(0, currencyResult.value);
      expect(moneyResult.ok).toBe(true);
    });
  });

  describe('add', () => {
    it('should add two Money instances with same currency', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const money1Result = Money.create(100, currencyResult.value);
      const money2Result = Money.create(50, currencyResult.value);

      expect(money1Result.ok).toBe(true);
      expect(money2Result.ok).toBe(true);

      if (!money1Result.ok || !money2Result.ok) return;

      const sumResult = money1Result.value.add(money2Result.value);
      expect(sumResult.ok).toBe(true);

      if (sumResult.ok) {
        expect(sumResult.value.amount).toBe(150);
        expect(sumResult.value.currency.code).toBe('USD');
      }
    });

    it('should fail to add Money with different currencies', () => {
      const usdResult = Currency.create('USD');
      const eurResult = Currency.create('EUR');

      expect(usdResult.ok).toBe(true);
      expect(eurResult.ok).toBe(true);

      if (!usdResult.ok || !eurResult.ok) return;

      const money1Result = Money.create(100, usdResult.value);
      const money2Result = Money.create(50, eurResult.value);

      expect(money1Result.ok).toBe(true);
      expect(money2Result.ok).toBe(true);

      if (!money1Result.ok || !money2Result.ok) return;

      const sumResult = money1Result.value.add(money2Result.value);
      expect(sumResult.ok).toBe(false);

      if (!sumResult.ok) {
        expect(sumResult.error).toContain('monedas diferentes');
      }
    });
  });

  describe('multiply', () => {
    it('should multiply Money by a positive factor', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(100, currencyResult.value);
      expect(moneyResult.ok).toBe(true);

      if (!moneyResult.ok) return;

      const productResult = moneyResult.value.multiply(3);
      expect(productResult.ok).toBe(true);

      if (productResult.ok) {
        expect(productResult.value.amount).toBe(300);
        expect(productResult.value.currency.code).toBe('USD');
      }
    });

    it('should handle decimal multiplication', () => {
      const currencyResult = Currency.create('EUR');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(99.99, currencyResult.value);
      expect(moneyResult.ok).toBe(true);

      if (!moneyResult.ok) return;

      const productResult = moneyResult.value.multiply(2);
      expect(productResult.ok).toBe(true);

      if (productResult.ok) {
        expect(productResult.value.amount).toBeCloseTo(199.98, 2);
      }
    });

    it('should reject negative factors', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(100, currencyResult.value);
      expect(moneyResult.ok).toBe(true);

      if (!moneyResult.ok) return;

      const productResult = moneyResult.value.multiply(-2);
      expect(productResult.ok).toBe(false);

      if (!productResult.ok) {
        expect(productResult.error).toContain('positivo');
      }
    });

    it('should multiply by zero', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const moneyResult = Money.create(100, currencyResult.value);
      expect(moneyResult.ok).toBe(true);

      if (!moneyResult.ok) return;

      const productResult = moneyResult.value.multiply(0);
      expect(productResult.ok).toBe(true);

      if (productResult.ok) {
        expect(productResult.value.amount).toBe(0);
      }
    });
  });

  describe('hasSameCurrency', () => {
    it('should return true for same currency', () => {
      const currencyResult = Currency.create('USD');
      expect(currencyResult.ok).toBe(true);

      if (!currencyResult.ok) return;

      const money1Result = Money.create(100, currencyResult.value);
      const money2Result = Money.create(200, currencyResult.value);

      expect(money1Result.ok).toBe(true);
      expect(money2Result.ok).toBe(true);

      if (!money1Result.ok || !money2Result.ok) return;

      expect(money1Result.value.hasSameCurrency(money2Result.value)).toBe(true);
    });

    it('should return false for different currencies', () => {
      const usdResult = Currency.create('USD');
      const eurResult = Currency.create('EUR');

      expect(usdResult.ok).toBe(true);
      expect(eurResult.ok).toBe(true);

      if (!usdResult.ok || !eurResult.ok) return;

      const money1Result = Money.create(100, usdResult.value);
      const money2Result = Money.create(100, eurResult.value);

      expect(money1Result.ok).toBe(true);
      expect(money2Result.ok).toBe(true);

      if (!money1Result.ok || !money2Result.ok) return;

      expect(money1Result.value.hasSameCurrency(money2Result.value)).toBe(false);
    });
  });
});
