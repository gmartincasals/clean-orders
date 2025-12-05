import { Money } from '@domain/value-objects/Money.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Currency } from '@domain/value-objects/Currency.js';
import { PricingService } from '@application/ports/PricingService.js';

/**
 * Stub PricingService - Retorna valores predefinidos
 * Útil para controlar exactamente qué precios se retornan en los tests
 */
export class StubPricingService implements PricingService {
  private prices: Map<string, Money> = new Map();
  private defaultPrice: Money | null = null;

  constructor() {
    // Configurar algunos precios por defecto
    const usd = Currency.USD();
    this.setPrice('DEFAULT', Money.create(99.99, usd).value!);
  }

  async getPrice(productId: ProductId): Promise<Money | null> {
    const price = this.prices.get(productId.value);
    if (price) {
      return price;
    }

    return this.defaultPrice || this.prices.get('DEFAULT') || null;
  }

  // Métodos de configuración para tests
  setPrice(productId: string, price: Money): void {
    this.prices.set(productId, price);
  }

  setDefaultPrice(price: Money): void {
    this.defaultPrice = price;
  }

  setPriceInUSD(productId: string, amount: number): void {
    const usd = Currency.USD();
    const moneyResult = Money.create(amount, usd);
    if (moneyResult.ok) {
      this.setPrice(productId, moneyResult.value);
    }
  }

  setPriceInEUR(productId: string, amount: number): void {
    const eur = Currency.EUR();
    const moneyResult = Money.create(amount, eur);
    if (moneyResult.ok) {
      this.setPrice(productId, moneyResult.value);
    }
  }

  removePrice(productId: string): void {
    this.prices.delete(productId);
  }

  clear(): void {
    this.prices.clear();
    this.defaultPrice = null;
  }
}
