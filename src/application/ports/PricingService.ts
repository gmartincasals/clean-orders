import { Money } from '@domain/value-objects/Money.js';
import { ProductId } from '@domain/value-objects/ProductId.js';

/**
 * Puerto: Servicio de precios
 * Define el contrato para obtener precios de productos
 */
export interface PricingService {
  /**
   * Obtiene el precio actual de un producto
   * @returns El precio del producto, o undefined si el producto no existe
   */
  getPrice(productId: ProductId): Promise<Money | undefined>;

  /**
   * Obtiene precios de múltiples productos de forma eficiente
   */
  getPrices(productIds: ProductId[]): Promise<Map<string, Money>>;
}
