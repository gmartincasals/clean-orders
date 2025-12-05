import { OrderId } from '@domain/value-objects/OrderId.js';
import { describe, expect, it } from 'vitest';

describe('OrderId Value Object', () => {
  describe('create', () => {
    it('should create a valid OrderId', () => {
      const result = OrderId.create('ORD-12345');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe('ORD-12345');
      }
    });

    it('should trim whitespace from order ID', () => {
      const result = OrderId.create('  ORD-12345  ');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe('ORD-12345');
      }
    });

    it('should accept order IDs with various formats', () => {
      const formats = [
        'ORD-001',
        'ORDER-2024-001',
        'UUID-a1b2c3d4',
        '12345',
        'ORDER_ABC_123',
      ];

      formats.forEach((format) => {
        const result = OrderId.create(format);
        expect(result.ok).toBe(true);
      });
    });

    it('should fail when order ID is empty string', () => {
      const result = OrderId.create('');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('El ID del pedido no puede estar vacío');
      }
    });

    it('should fail when order ID is only whitespace', () => {
      const result = OrderId.create('   ');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('El ID del pedido no puede estar vacío');
      }
    });

    it('should fail when order ID contains only tabs and newlines', () => {
      const result = OrderId.create('\t\n\r');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('El ID del pedido no puede estar vacío');
      }
    });
  });

  describe('generate', () => {
    it('should generate a unique order ID', () => {
      const id = OrderId.generate();

      expect(id.value).toMatch(/^ORD-/);
      expect(id.value.length).toBeGreaterThan(4);
    });

    it('should generate different IDs on consecutive calls', () => {
      const id1 = OrderId.generate();
      const id2 = OrderId.generate();
      const id3 = OrderId.generate();

      expect(id1.value).not.toBe(id2.value);
      expect(id2.value).not.toBe(id3.value);
      expect(id1.value).not.toBe(id3.value);
    });

    it('should generate IDs that start with ORD prefix', () => {
      const ids = Array.from({ length: 10 }, () => OrderId.generate());

      ids.forEach((id) => {
        expect(id.value.startsWith('ORD-')).toBe(true);
      });
    });

    it('should generate IDs with timestamp component', () => {
      const id1 = OrderId.generate();

      // Wait a bit to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Busy wait
      }

      const id2 = OrderId.generate();

      // IDs should be different due to timestamp
      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('equals', () => {
    it('should return true for identical order IDs', () => {
      const id1Result = OrderId.create('ORD-12345');
      const id2Result = OrderId.create('ORD-12345');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
      }
    });

    it('should return false for different order IDs', () => {
      const id1Result = OrderId.create('ORD-12345');
      const id2Result = OrderId.create('ORD-67890');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(false);
      }
    });

    it('should return true for IDs that differ only in whitespace', () => {
      const id1Result = OrderId.create('ORD-12345');
      const id2Result = OrderId.create('  ORD-12345  ');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
      }
    });

    it('should be case-sensitive', () => {
      const id1Result = OrderId.create('ord-12345');
      const id2Result = OrderId.create('ORD-12345');

      expect(id1Result.ok).toBe(true);
      expect(id2Result.ok).toBe(true);

      if (id1Result.ok && id2Result.ok) {
        expect(id1Result.value.equals(id2Result.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the order ID value', () => {
      const result = OrderId.create('ORD-12345');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.toString()).toBe('ORD-12345');
      }
    });
  });

  describe('value getter', () => {
    it('should return the internal value', () => {
      const result = OrderId.create('ORD-XYZ');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe('ORD-XYZ');
      }
    });
  });
});
