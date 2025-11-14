import { Result, ok, fail } from '../../shared/Results.js';
import { Currency } from './Currency.js';

/**
 * Value Object: Money
 * Representa una cantidad monetaria con su moneda
 * Invariantes:
 * - El monto debe ser un número válido
 * - El monto no puede ser negativo
 * - La moneda debe ser un código ISO 4217 válido de 3 letras
 */
export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: Currency
  ) {}

  static create(amount: number, currency: Currency): Result<Money, string> {
    if (!Number.isFinite(amount)) {
      return fail('El monto debe ser un número válido');
    }

    if (amount < 0) {
      return fail('El monto no puede ser negativo');
    }

    return ok(new Money(amount, currency));
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  add(other: Money): Result<Money, string> {
    if (!this.hasSameCurrency(other)) {
      return fail(
        `No se pueden sumar cantidades con monedas diferentes: ${this._currency.code} y ${other._currency.code}`
      );
    }

    return Money.create(this._amount + other._amount, this._currency);
  }

  multiply(factor: number): Result<Money, string> {
    if (!Number.isFinite(factor) || factor < 0) {
      return fail('El factor de multiplicación debe ser un número positivo válido');
    }

    return Money.create(this._amount * factor, this._currency);
  }

  hasSameCurrency(other: Money): boolean {
    return this._currency.equals(other._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency.equals(other._currency);
  }

  toString(): string {
    return `${this._currency.symbol}${this._amount.toFixed(2)}`;
  }

  toJSON(): { amount: number; currency: string } {
    return {
      amount: this._amount,
      currency: this._currency.code,
    };
  }
}
