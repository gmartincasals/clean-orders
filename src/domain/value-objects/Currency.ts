import { Result, ok, fail } from '../../shared/Results.js';

/**
 * Códigos de moneda ISO 4217 soportados
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'MXN' | 'ARS' | 'CLP';

/**
 * Mapeo de códigos de moneda a sus símbolos
 */
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  MXN: '$',
  ARS: '$',
  CLP: '$',
};

/**
 * Mapeo de códigos de moneda a sus nombres
 */
const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  MXN: 'Mexican Peso',
  ARS: 'Argentine Peso',
  CLP: 'Chilean Peso',
};

/**
 * Value Object: Currency
 * Representa una moneda ISO 4217
 * Invariantes:
 * - Debe ser un código de moneda válido (ISO 4217)
 * - El código debe estar en la lista de monedas soportadas
 */
export class Currency {
  private constructor(private readonly _code: CurrencyCode) {}

  static create(code: string): Result<Currency, string> {
    const upperCode = code.toUpperCase();

    if (!this.isValidCurrencyCode(upperCode)) {
      return fail(
        `Código de moneda inválido: ${code}. Códigos soportados: ${this.getSupportedCurrencies().join(', ')}`
      );
    }

    return ok(new Currency(upperCode as CurrencyCode));
  }

  static USD(): Currency {
    return new Currency('USD');
  }

  static EUR(): Currency {
    return new Currency('EUR');
  }

  static GBP(): Currency {
    return new Currency('GBP');
  }

  static JPY(): Currency {
    return new Currency('JPY');
  }

  static MXN(): Currency {
    return new Currency('MXN');
  }

  static ARS(): Currency {
    return new Currency('ARS');
  }

  static CLP(): Currency {
    return new Currency('CLP');
  }

  get code(): CurrencyCode {
    return this._code;
  }

  get symbol(): string {
    return CURRENCY_SYMBOLS[this._code];
  }

  get name(): string {
    return CURRENCY_NAMES[this._code];
  }

  equals(other: Currency): boolean {
    return this._code === other._code;
  }

  toString(): string {
    return this._code;
  }

  toJSON(): string {
    return this._code;
  }

  private static isValidCurrencyCode(code: string): code is CurrencyCode {
    return ['USD', 'EUR', 'GBP', 'JPY', 'MXN', 'ARS', 'CLP'].includes(code);
  }

  private static getSupportedCurrencies(): CurrencyCode[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'MXN', 'ARS', 'CLP'];
  }
}
