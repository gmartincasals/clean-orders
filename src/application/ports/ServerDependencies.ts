import { Clock } from './Clock.js';
import { EventBus } from './EventBus.js';
import { Logger } from './Logger.js';
import { OrderRepository } from './OrderRepository.js';
import { PricingService } from './PricingService.js';

/**
 * Contenedor de dependencias del servidor
 * Agrupa todos los servicios y repositorios necesarios para la aplicación
 */
export interface ServerDependencies {
  /**
   * Repositorio de pedidos
   */
  orderRepository: OrderRepository;

  /**
   * Servicio de precios
   */
  pricingService: PricingService;

  /**
   * Bus de eventos de dominio
   */
  eventBus: EventBus;

  /**
   * Reloj del sistema
   */
  clock: Clock;

  /**
   * Logger de la aplicación
   */
  logger: Logger;
}
