import { PricingService } from '@application/ports/PricingService.js';
import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';
import { ProductId } from '@domain/value-objects/ProductId.js';

/**
 * Catálogo de precios estático
 * Simula un servicio externo de precios con un catálogo predefinido
 */
interface PriceEntry {
  productId: string;
  price: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'MXN' | 'ARS' | 'CLP';
}

/**
 * Implementación estática del servicio de precios
 * Simula un servicio externo con precios predefinidos
 * Útil para desarrollo, testing y demos
 */
export class StaticPricingService implements PricingService {
  private readonly catalog: Map<string, Money>;

  constructor(priceEntries?: PriceEntry[]) {
    this.catalog = new Map();

    // Catálogo por defecto si no se proveen precios
    const defaultCatalog: PriceEntry[] = priceEntries || [
      // Productos en USD
      { productId: 'LAPTOP-001', price: 1299.99, currency: 'USD' },
      { productId: 'MOUSE-001', price: 29.99, currency: 'USD' },
      { productId: 'KEYBOARD-001', price: 89.99, currency: 'USD' },
      { productId: 'MONITOR-001', price: 399.99, currency: 'USD' },
      { productId: 'HEADSET-001', price: 149.99, currency: 'USD' },
      { productId: 'WEBCAM-001', price: 79.99, currency: 'USD' },
      { productId: 'DESK-001', price: 299.99, currency: 'USD' },
      { productId: 'CHAIR-001', price: 449.99, currency: 'USD' },

      // Productos en EUR
      { productId: 'LAPTOP-002', price: 1199.99, currency: 'EUR' },
      { productId: 'MOUSE-002', price: 27.99, currency: 'EUR' },
      { productId: 'KEYBOARD-002', price: 82.99, currency: 'EUR' },
      { productId: 'MONITOR-002', price: 369.99, currency: 'EUR' },
      { productId: 'TABLET-001', price: 599.99, currency: 'EUR' },
      { productId: 'SMARTPHONE-001', price: 899.99, currency: 'EUR' },
      { productId: 'SPEAKER-001', price: 129.99, currency: 'EUR' },
      { productId: 'PRINTER-001', price: 249.99, currency: 'EUR' },
    ];

    // Inicializar el catálogo
    for (const entry of defaultCatalog) {
      const currencyResult = Currency.create(entry.currency);
      if (currencyResult.ok) {
        const moneyResult = Money.create(entry.price, currencyResult.value);
        if (moneyResult.ok) {
          this.catalog.set(entry.productId, moneyResult.value);
        }
      }
    }
  }

  async getPrice(productId: ProductId): Promise<Money | undefined> {
    // Simular latencia de red
    await this.simulateNetworkDelay();

    return this.catalog.get(productId.value);
  }

  async getPrices(productIds: ProductId[]): Promise<Map<string, Money>> {
    // Simular latencia de red
    await this.simulateNetworkDelay();

    const result = new Map<string, Money>();

    for (const productId of productIds) {
      const price = this.catalog.get(productId.value);
      if (price) {
        result.set(productId.value, price);
      }
    }

    return result;
  }

  /**
   * Métodos adicionales para testing y configuración
   */

  /**
   * Agrega un nuevo precio al catálogo
   */
  addPrice(
    productId: string,
    price: number,
    currencyCode: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'MXN' | 'ARS' | 'CLP'
  ): void {
    const currencyResult = Currency.create(currencyCode);
    if (currencyResult.ok) {
      const moneyResult = Money.create(price, currencyResult.value);
      if (moneyResult.ok) {
        this.catalog.set(productId, moneyResult.value);
      }
    }
  }

  /**
   * Actualiza el precio de un producto existente
   */
  updatePrice(productId: string, price: number): void {
    const existingPrice = this.catalog.get(productId);
    if (existingPrice) {
      const moneyResult = Money.create(price, existingPrice.currency);
      if (moneyResult.ok) {
        this.catalog.set(productId, moneyResult.value);
      }
    }
  }

  /**
   * Elimina un producto del catálogo
   */
  removePrice(productId: string): void {
    this.catalog.delete(productId);
  }

  /**
   * Limpia todo el catálogo
   */
  clearCatalog(): void {
    this.catalog.clear();
  }

  /**
   * Obtiene todos los productos del catálogo
   */
  getAllProducts(): string[] {
    return Array.from(this.catalog.keys());
  }

  /**
   * Verifica si existe un producto en el catálogo
   */
  hasProduct(productId: string): boolean {
    return this.catalog.has(productId);
  }

  /**
   * Simula la latencia de red de un servicio externo
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.random() * 50 + 10; // 10-60ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
