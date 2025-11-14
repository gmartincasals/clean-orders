import { Result, ok, fail } from '../../shared/Results.js';

/**
 * Value Object: OrderId
 * Representa el identificador único de un pedido
 * Invariantes:
 * - No puede estar vacío
 * - Debe ser una cadena válida
 */
export class OrderId {
  private constructor(private readonly _value: string) {}

  static create(value: string): Result<OrderId, string> {
    if (!value || value.trim().length === 0) {
      return fail('El ID del pedido no puede estar vacío');
    }

    return ok(new OrderId(value.trim()));
  }

  static generate(): OrderId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return new OrderId(`ORD-${timestamp}-${random}`);
  }

  get value(): string {
    return this._value;
  }

  equals(other: OrderId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
