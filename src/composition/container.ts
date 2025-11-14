import { Clock } from '@application/ports/Clock.js';
import { EventBus } from '@application/ports/EventBus.js';
import { OrderRepository } from '@application/ports/OrderRepository.js';
import { PricingService } from '@application/ports/PricingService.js';
import { ServerDependencies } from '@application/ports/ServerDependencies.js';
import { StaticPricingService } from '@infrastructure/http/StaticPricingService.js';
import { NoopEventBus } from '@infrastructure/messaging/NoopEventBus.js';
import { InMemoryOrderRepository } from '@infrastructure/persistence/in-memory/InMemoryOrderRepository.js';

/**
 * Implementación simple del Clock usando Date
 */
class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  timestamp(): number {
    return Date.now();
  }
}

/**
 * Contenedor de Inyección de Dependencias
 * Composition Root de la aplicación
 * Aquí se configuran e instancian todas las dependencias
 */
export class Container {
  private static instance: Container | null = null;
  private readonly dependencies: ServerDependencies;

  private constructor() {
    // Instanciar todas las dependencias de infraestructura
    const orderRepository = this.createOrderRepository();
    const pricingService = this.createPricingService();
    const eventBus = this.createEventBus();
    const clock = this.createClock();

    this.dependencies = {
      orderRepository,
      pricingService,
      eventBus,
      clock,
    };
  }

  /**
   * Singleton pattern para obtener la instancia del contenedor
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Resetea el contenedor (útil para testing)
   */
  static reset(): void {
    Container.instance = null;
  }

  /**
   * Obtiene todas las dependencias del servidor
   */
  getDependencies(): ServerDependencies {
    return this.dependencies;
  }

  /**
   * Factory methods para crear las dependencias
   */

  private createOrderRepository(): OrderRepository {
    // En producción, aquí podrías cambiar a PostgresOrderRepository, MongoOrderRepository, etc.
    return new InMemoryOrderRepository();
  }

  private createPricingService(): PricingService {
    // En producción, aquí podrías cambiar a HttpPricingService que llame a un API real
    return new StaticPricingService();
  }

  private createEventBus(): EventBus {
    // En producción, aquí podrías cambiar a RabbitMQEventBus, KafkaEventBus, etc.
    // Pasar true para habilitar logging en desarrollo
    const shouldLog = process.env.NODE_ENV !== 'production';
    return new NoopEventBus(shouldLog);
  }

  private createClock(): Clock {
    // En testing, podrías usar un FakeClock para controlar el tiempo
    return new SystemClock();
  }
}

/**
 * Factory function conveniente para obtener las dependencias
 */
export function createDependencies(): ServerDependencies {
  return Container.getInstance().getDependencies();
}

/**
 * Factory function para crear un contenedor con dependencias custom (útil para testing)
 */
export function createTestContainer(overrides?: Partial<ServerDependencies>): ServerDependencies {
  const defaultDeps = Container.getInstance().getDependencies();

  return {
    orderRepository: overrides?.orderRepository ?? defaultDeps.orderRepository,
    pricingService: overrides?.pricingService ?? defaultDeps.pricingService,
    eventBus: overrides?.eventBus ?? defaultDeps.eventBus,
    clock: overrides?.clock ?? defaultDeps.clock,
  };
}
