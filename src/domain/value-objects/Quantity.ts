import { Result, ok, fail } from '../../shared/Results.js';

/**
 * Value Object: Quantity
 * Representa una cantidad de productos
 * Invariantes:
 * - Debe ser un número entero positivo
 * - No puede ser cero
 */
export class Quantity {
  private constructor(private readonly _value: number) {}

  static create(value: number): Result<Quantity, string> {
    if (!Number.isInteger(value)) {
      return fail('La cantidad debe ser un número entero');
    }

    if (value <= 0) {
      return fail('La cantidad debe ser mayor que cero');
    }

    return ok(new Quantity(value));
  }

  get value(): number {
    return this._value;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this._value + other._value);
  }

  equals(other: Quantity): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }
}
