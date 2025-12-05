import { ProductId } from '@domain/value-objects/ProductId.js';
import { describe, expect, it } from 'vitest';

describe('ProductId Value Object', () => {
  describe('create', () => {
    it('should create a valid ProductId', () => {
      const result = ProductId.create('LAPTOP-001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe('LAPTOP-001');
      }
    });

    it('should trim whitespace from product ID', () => {
      const result = ProductId.create('  LAPTOP-001  ');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe('LAPTOP-001');
      }
    });

    it('should accept product IDs with special characters', () => {
      const specialIds = [
        'PROD-123-ABC',
        'SKU_2024_001',
        'ITEM.XYZ.789',
        'PRODUCT@CATEGORY#001',
        'código-español-ñ',
      ];

      specialIds.forEach((id) => {
        const result = ProductId.create(id);
        expect(result.ok).toBe(true);
      });
    });

    it('should fail when product ID is empty string', () => {
      const result = ProductId.create('');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('El ID del producto no puede estar vacío');
      }
    });

    it('should fail when product ID is only whitespace', () => {
      const result = ProductId.create('   ');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('El ID del producto no puede estar vacío');
      }
    });

    it('should fail when product ID is only tabs and newlines', () => {
      const result = ProductId.create('\t\n\r  ');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('El ID del producto no puede estar vacío');
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical product IDs', () => {
      const id1Result = ProductId.create('LAPTOP-001');
      const id2Result = ProductId.create('LAPTOP-001');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
      }
    });

    it('should return false for different product IDs', () => {
      const id1Result = ProductId.create('LAPTOP-001');
      const id2Result = ProductId.create('LAPTOP-002');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(false);
      }
    });

    it('should return true for IDs that differ only in whitespace', () => {
      const id1Result = ProductId.create('LAPTOP-001');
      const id2Result = ProductId.create('  LAPTOP-001  ');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
      }
    });

    it('should be case-sensitive', () => {
      const id1Result = ProductId.create('laptop-001');
      const id2Result = ProductId.create('LAPTOP-001');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the product ID value', () => {
      const result = ProductId.create('LAPTOP-001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.toString()).toBe('LAPTOP-001');
      }
    });
  });

  describe('value getter', () => {
    it('should return the internal value', () => {
      const result = ProductId.create('MOUSE-XYZ');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe('MOUSE-XYZ');
      }
    });
  });
});
