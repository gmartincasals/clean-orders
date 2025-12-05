import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';

/**
 * Builder para crear valores Money con diferentes escenarios
 */
export class MoneyBuilder {
  private amount: number = 100;
  private currencyCode: string = 'USD';

  static aMoney(): MoneyBuilder {
    return new MoneyBuilder();
  }

  withAmount(amount: number): MoneyBuilder {
    this.amount = amount;
    return this;
  }

  withCurrency(code: string): MoneyBuilder {
    this.currencyCode = code;
    return this;
  }

  inUSD(): MoneyBuilder {
    return this.withCurrency('USD');
  }

  inEUR(): MoneyBuilder {
    return this.withCurrency('EUR');
  }

  inGBP(): MoneyBuilder {
    return this.withCurrency('GBP');
  }

  withRandomAmount(min = 1, max = 1000): MoneyBuilder {
    this.amount = Math.random() * (max - min) + min;
    return this;
  }

  zero(): MoneyBuilder {
    this.amount = 0;
    return this;
  }

  small(): MoneyBuilder {
    return this.withAmount(9.99);
  }

  medium(): MoneyBuilder {
    return this.withAmount(99.99);
  }

  large(): MoneyBuilder {
    return this.withAmount(999.99);
  }

  veryLarge(): MoneyBuilder {
    return this.withAmount(9999.99);
  }

  build(): Money {
    const currencyResult = Currency.create(this.currencyCode);
    if (!currencyResult.ok) {
      throw new Error(`Invalid currency: ${this.currencyCode}`);
    }

    const moneyResult = Money.create(this.amount, currencyResult.value);
    if (!moneyResult.ok) {
      throw new Error(`Invalid money: ${moneyResult.error}`);
    }

    return moneyResult.value;
  }

  buildInvalid(amount: number): { amount: number; currency: Currency } {
    const currencyResult = Currency.create(this.currencyCode);
    if (!currencyResult.ok) {
      throw new Error(`Invalid currency: ${this.currencyCode}`);
    }

    return { amount, currency: currencyResult.value };
  }
}
