import { Clock } from '@application/ports/Clock.js';
import { EventBus } from '@application/ports/EventBus.js';
import { Logger } from '@application/ports/Logger.js';
import { OrderRepository } from '@application/ports/OrderRepository.js';
import { PricingService } from '@application/ports/PricingService.js';
import { ServerDependencies } from '@application/ports/ServerDependencies.js';
import { createDatabaseFactory, DatabaseFactory } from '@infrastructure/database/DatabaseFactory.js';
import { StaticPricingService } from '@infrastructure/http/StaticPricingService.js';
import { LoggerFactory } from '@infrastructure/logging/PinoLogger.js';
import { createOutboxMessaging, createNoopMessaging, MessagingFactory } from '@infrastructure/messaging/MessagingFactory.js';
import { InMemoryOrderRepository } from '@infrastructure/persistence/in-memory/InMemoryOrderRepository.js';
import { PostgresOrderRepository } from '@infrastructure/persistence/postgres/PostgresOrderRepository.js';
import { config } from './config.js';

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
  private readonly databaseFactory: DatabaseFactory | null = null;
  private readonly messagingFactory: MessagingFactory | null = null;
  private readonly logger: Logger;

  private constructor() {
    // Crear logger primero (necesario para todas las demás dependencias)
    this.logger = this.createLogger();

    // Instanciar factories si no usamos InMemory
    if (!config.USE_INMEMORY) {
      this.databaseFactory = this.createDatabaseFactory();
      this.messagingFactory = this.createMessagingFactory();
    }

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
      logger: this.logger,
    };

    this.logger.info('Container initialized', {
      useInMemory: config.USE_INMEMORY,
      environment: config.NODE_ENV,
    });
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
   * Cierra todos los recursos del contenedor
   */
  async close(): Promise<void> {
    this.logger.info('Closing container resources');

    try {
      // Cerrar messaging factory si existe
      if (this.messagingFactory) {
        await this.messagingFactory.close();
      }

      // Cerrar database factory si existe
      if (this.databaseFactory) {
        await this.databaseFactory.close();
      }

      this.logger.info('Container resources closed successfully');
    } catch (error) {
      this.logger.error('Error closing container resources', { error });
      throw error;
    }
  }

  /**
   * Factory methods para crear las dependencias
   */

  private createLogger(): Logger {
    return LoggerFactory.create({
      level: config.LOG_LEVEL as any,
      prettyPrint: config.NODE_ENV !== 'production',
      name: 'clean-orders',
    });
  }

  private createDatabaseFactory(): DatabaseFactory {
    return createDatabaseFactory(config.DATABASE_URL, this.logger);
  }

  private createMessagingFactory(): MessagingFactory {
    if (!this.databaseFactory) {
      throw new Error('DatabaseFactory must be created before MessagingFactory');
    }

    return createOutboxMessaging(
      config.DATABASE_URL,
      this.databaseFactory.getPool(),
      this.logger
    );
  }

  private createOrderRepository(): OrderRepository {
    if (config.USE_INMEMORY) {
      this.logger.info('Using InMemory OrderRepository');
      return new InMemoryOrderRepository();
    }

    if (!this.databaseFactory) {
      throw new Error('DatabaseFactory is required for PostgresOrderRepository');
    }

    this.logger.info('Using Postgres OrderRepository');
    return new PostgresOrderRepository(config.DATABASE_URL);
  }

  private createPricingService(): PricingService {
    // En producción, aquí podrías cambiar a HttpPricingService que llame a un API real
    this.logger.info('Using Static PricingService');
    return new StaticPricingService();
  }

  private createEventBus(): EventBus {
    if (config.USE_INMEMORY) {
      this.logger.info('Using Noop EventBus');
      const shouldLog = config.NODE_ENV !== 'production';
      const factory = createNoopMessaging(this.logger, shouldLog);
      return factory.getEventBus();
    }

    if (!this.messagingFactory) {
      throw new Error('MessagingFactory is required for Outbox EventBus');
    }

    this.logger.info('Using Outbox EventBus');
    return this.messagingFactory.getEventBus();
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
 * Factory function para cerrar el contenedor
 */
export async function closeContainer(): Promise<void> {
  const container = Container.getInstance();
  await container.close();
  Container.reset();
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
    logger: overrides?.logger ?? defaultDeps.logger,
  };
}
