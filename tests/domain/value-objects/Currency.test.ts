import { Currency } from '@domain/value-objects/Currency.js';
import { describe, expect, it } from 'vitest';

describe('Currency Value Object', () => {
  describe('create', () => {
    it('should create USD currency', () => {
      const result = Currency.create('USD');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('USD');
        expect(result.value.symbol).toBe('$');
        expect(result.value.name).toBe('US Dollar');
      }
    });

    it('should create EUR currency', () => {
      const result = Currency.create('EUR');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('EUR');
        expect(result.value.symbol).toBe('€');
        expect(result.value.name).toBe('Euro');
      }
    });

    it('should create GBP currency', () => {
      const result = Currency.create('GBP');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('GBP');
        expect(result.value.symbol).toBe('£');
        expect(result.value.name).toBe('British Pound');
      }
    });

    it('should be case-insensitive', () => {
      const usdLower = Currency.create('usd');
      const usdUpper = Currency.create('USD');
      const usdMixed = Currency.create('UsD');

      expect(usdLower.ok).toBe(true);
      expect(usdUpper.ok).toBe(true);
      expect(usdMixed.ok).toBe(true);

      if (usdLower.ok && usdUpper.ok && usdMixed.ok) {
        expect(usdLower.value.code).toBe('USD');
        expect(usdUpper.value.code).toBe('USD');
        expect(usdMixed.value.code).toBe('USD');
      }
    });

    it('should fail when currency code has whitespace', () => {
      const result = Currency.create('  EUR  ');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });

    it('should fail when currency code is empty', () => {
      const result = Currency.create('');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });

    it('should fail when currency code is only whitespace', () => {
      const result = Currency.create('   ');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });

    it('should fail for unsupported currency codes', () => {
      const unsupportedCodes = ['XXX', 'INVALID', 'ABC', '123', 'US'];

      unsupportedCodes.forEach((code) => {
        const result = Currency.create(code);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain('Código de moneda inválido');
        }
      });
    });

    it('should fail when currency code is too long', () => {
      const result = Currency.create('USDDOLLAR');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });

    it('should fail when currency code is too short', () => {
      const result = Currency.create('US');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });

    it('should fail when currency code contains special characters', () => {
      const result = Currency.create('US$');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });

    it('should fail when currency code contains numbers', () => {
      const result = Currency.create('US1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Código de moneda inválido');
      }
    });
  });

  describe('equals', () => {
    it('should return true for same currency', () => {
      const usd1 = Currency.create('USD');
      const usd2 = Currency.create('USD');

      expect(usd1.ok).toBe(true);
      expect(usd2.ok).toBe(true);

      if (usd1.ok && usd2.ok) {
        expect(usd1.value.equals(usd2.value)).toBe(true);
      }
    });

    it('should return true for same currency with different casing', () => {
      const usd1 = Currency.create('usd');
      const usd2 = Currency.create('USD');

      expect(usd1.ok).toBe(true);
      expect(usd2.ok).toBe(true);

      if (usd1.ok && usd2.ok) {
        expect(usd1.value.equals(usd2.value)).toBe(true);
      }
    });

    it('should return false for different currencies', () => {
      const usd = Currency.create('USD');
      const eur = Currency.create('EUR');

      expect(usd.ok).toBe(true);
      expect(eur.ok).toBe(true);

      if (usd.ok && eur.ok) {
        expect(usd.value.equals(eur.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return currency code', () => {
      const result = Currency.create('EUR');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.toString()).toBe('EUR');
      }
    });
  });

  describe('properties', () => {
    it('should expose code, symbol, and name for USD', () => {
      const result = Currency.create('USD');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('USD');
        expect(result.value.symbol).toBe('$');
        expect(result.value.name).toBe('US Dollar');
      }
    });

    it('should expose code, symbol, and name for EUR', () => {
      const result = Currency.create('EUR');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('EUR');
        expect(result.value.symbol).toBe('€');
        expect(result.value.name).toBe('Euro');
      }
    });

    it('should expose code, symbol, and name for GBP', () => {
      const result = Currency.create('GBP');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('GBP');
        expect(result.value.symbol).toBe('£');
        expect(result.value.name).toBe('British Pound');
      }
    });
  });
});
