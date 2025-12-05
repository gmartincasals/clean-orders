import { EventBus } from '@application/ports/EventBus.js';
import { Logger } from '@application/ports/Logger.js';
import pg from 'pg';
import { NoopEventBus } from './NoopEventBus.js';
import { OutboxEventBus } from './OutBoxEventBus.js';
import { OutboxDispatcher } from './OutboxDispatcher.js';

/**
 * Tipos de EventBus disponibles
 */
export enum EventBusType {
  NOOP = 'noop',
  OUTBOX = 'outbox',
}

/**
 * Configuración para el MessagingFactory
 */
export interface MessagingConfig {
  eventBusType: EventBusType;
  connectionString?: string;
  pool?: pg.Pool;
  poolClient?: pg.PoolClient;
  logger?: Logger;
  noopConfig?: {
    shouldLog?: boolean;
  };
  dispatcherConfig?: {
    batchSize?: number;
    pollIntervalMs?: number;
    maxRetries?: number;
  };
}

/**
 * Factory para crear componentes de mensajería
 * Centraliza la creación de EventBus y OutboxDispatcher
 */
export class MessagingFactory {
  private static instance: MessagingFactory | null = null;
  private eventBus: EventBus | null = null;
  private dispatcher: OutboxDispatcher | null = null;
  private config: MessagingConfig;
  private logger: Logger;

  private constructor(config: MessagingConfig) {
    this.config = config;
    
    if (!config.logger) {
      throw new Error('Logger is required for MessagingFactory');
    }
    this.logger = config.logger;
  }

  /**
   * Obtiene la instancia singleton del MessagingFactory
   */
  static getInstance(config: MessagingConfig): MessagingFactory {
    if (!MessagingFactory.instance) {
      MessagingFactory.instance = new MessagingFactory(config);
    }
    return MessagingFactory.instance;
  }

  /**
   * Crea un EventBus según la configuración
   */
  createEventBus(): EventBus {
    if (this.eventBus) {
      return this.eventBus;
    }

    this.logger.info('Creating EventBus', { type: this.config.eventBusType });

    switch (this.config.eventBusType) {
      case EventBusType.NOOP:
        this.eventBus = new NoopEventBus(this.config.noopConfig?.shouldLog ?? false);
        break;

      case EventBusType.OUTBOX:
        if (!this.config.pool && !this.config.poolClient) {
          throw new Error('Pool or PoolClient is required for OutboxEventBus');
        }
        this.eventBus = new OutboxEventBus(
          (this.config.poolClient ?? this.config.pool)!
        );
        break;

      default:
        throw new Error(`Unknown EventBus type: ${this.config.eventBusType}`);
    }

    return this.eventBus;
  }

  /**
   * Obtiene el EventBus actual (lo crea si no existe)
   */
  getEventBus(): EventBus {
    if (!this.eventBus) {
      return this.createEventBus();
    }
    return this.eventBus;
  }

  /**
   * Crea un OutboxDispatcher para procesar eventos
   * Solo disponible cuando se usa OutboxEventBus
   */
  createDispatcher(): OutboxDispatcher {
    if (this.dispatcher) {
      return this.dispatcher;
    }

    if (this.config.eventBusType !== EventBusType.OUTBOX) {
      throw new Error('Dispatcher only available with OutboxEventBus');
    }

    if (!this.config.connectionString) {
      throw new Error('Connection string is required for OutboxDispatcher');
    }

    this.logger.info('Creating OutboxDispatcher');

    this.dispatcher = new OutboxDispatcher({
      connectionString: this.config.connectionString,
      batchSize: this.config.dispatcherConfig?.batchSize,
      pollIntervalMs: this.config.dispatcherConfig?.pollIntervalMs,
      maxRetries: this.config.dispatcherConfig?.maxRetries,
      logger: this.logger,
    });

    return this.dispatcher;
  }

  /**
   * Obtiene el Dispatcher actual (lo crea si no existe)
   */
  getDispatcher(): OutboxDispatcher {
    if (!this.dispatcher) {
      return this.createDispatcher();
    }
    return this.dispatcher;
  }

  /**
   * Cierra todos los recursos de mensajería
   */
  async close(): Promise<void> {
    this.logger.info('Closing messaging resources');

    if (this.dispatcher) {
      await this.dispatcher.stop();
      this.dispatcher = null;
    }

    this.eventBus = null;
    MessagingFactory.instance = null;

    this.logger.info('Messaging resources closed');
  }

  /**
   * Resetea la instancia singleton (útil para testing)
   */
  static reset(): void {
    MessagingFactory.instance = null;
  }
}

/**
 * Helper para crear un MessagingFactory con EventBus Noop
 */
export function createNoopMessaging(logger: Logger, shouldLog = false): MessagingFactory {
  return MessagingFactory.getInstance({
    eventBusType: EventBusType.NOOP,
    noopConfig: { shouldLog },
    logger,
  });
}

/**
 * Helper para crear un MessagingFactory con OutboxEventBus
 */
export function createOutboxMessaging(
  connectionString: string,
  pool: pg.Pool,
  logger: Logger,
  dispatcherConfig?: {
    batchSize?: number;
    pollIntervalMs?: number;
    maxRetries?: number;
  }
): MessagingFactory {
  return MessagingFactory.getInstance({
    eventBusType: EventBusType.OUTBOX,
    connectionString,
    pool,
    logger,
    dispatcherConfig,
  });
}

/**
 * Helper para crear un MessagingFactory con OutboxEventBus usando un PoolClient
 * (útil para usar dentro de transacciones)
 */
export function createOutboxMessagingWithClient(
  poolClient: pg.PoolClient,
  logger: Logger
): MessagingFactory {
  return MessagingFactory.getInstance({
    eventBusType: EventBusType.OUTBOX,
    poolClient,
    logger,
  });
}
