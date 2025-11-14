import { Result, ok, fail } from '../../shared/Results.js';

/**
 * Value Object: ProductId
 * Representa el identificador único de un producto
 * Invariantes:
 * - No puede estar vacío
 * - Debe ser una cadena válida
 */
export class ProductId {
  private constructor(private readonly _value: string) {}

  static create(value: string): Result<ProductId, string> {
    if (!value || value.trim().length === 0) {
      return fail('El ID del producto no puede estar vacío');
    }

    return ok(new ProductId(value.trim()));
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProductId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
