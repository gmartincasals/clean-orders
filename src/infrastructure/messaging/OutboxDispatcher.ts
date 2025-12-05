import { Logger } from '@application/ports/Logger.js';
import pg from 'pg';

const { Pool } = pg;

/**
 * Representa un evento almacenado en la tabla outbox
 */
interface OutboxEvent {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

/**
 * Configuración del dispatcher
 */
export interface OutboxDispatcherConfig {
  connectionString: string;
  batchSize?: number;
  pollIntervalMs?: number;
  maxRetries?: number;
  logger?: Logger;
}

/**
 * Dispatcher que procesa eventos del outbox de forma concurrente y segura
 * Usa FOR UPDATE SKIP LOCKED para evitar contención entre workers
 */
export class OutboxDispatcher {
  private readonly pool: pg.Pool;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly logger: Logger;
  private isRunning = false;
  private pollTimeout?: NodeJS.Timeout;

  constructor(config: OutboxDispatcherConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: 10, // Pool máximo de conexiones
    });
    this.batchSize = config.batchSize ?? 10;
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
    
    if (!config.logger) {
      throw new Error('Logger is required for OutboxDispatcher');
    }
    this.logger = config.logger;
  }

  /**
   * Inicia el dispatcher en modo polling
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Dispatcher already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Outbox dispatcher started');

    await this.poll();
  }

  /**
   * Detiene el dispatcher
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    await this.pool.end();
    this.logger.info('Outbox dispatcher stopped');
  }

  /**
   * Loop de polling para procesar eventos
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        const processedCount = await this.processNextBatch();

        if (processedCount > 0) {
          this.logger.info('Batch processed', { processedCount });
        }

        // Si procesamos eventos, inmediatamente buscamos más
        // Si no hay eventos, esperamos el intervalo configurado
        const waitTime = processedCount > 0 ? 0 : this.pollIntervalMs;

        if (waitTime > 0) {
          await this.sleep(waitTime);
        }
      } catch (error) {
        this.logger.error('Error processing batch', { error });
        await this.sleep(this.pollIntervalMs);
      }
    }
  }

  /**
   * Procesa el siguiente lote de eventos
   * Usa FOR UPDATE SKIP LOCKED para bloqueo optimista
   */
  private async processNextBatch(): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Selecciona eventos no publicados y los bloquea
      // SKIP LOCKED evita que otros workers esperen por estos registros
      const result = await client.query<OutboxEvent>(
        `SELECT id, aggregate_type, aggregate_id, event_type, payload, created_at
         FROM outbox
         WHERE published_at IS NULL
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [this.batchSize]
      );

      const events = result.rows;

      if (events.length === 0) {
        await client.query('COMMIT');
        return 0;
      }

      // Procesar cada evento
      for (const event of events) {
        await this.publishEvent(event);
      }

      // Marcar todos los eventos como publicados
      const eventIds = events.map((e) => e.id);
      await client.query(
        `UPDATE outbox
         SET published_at = $1
         WHERE id = ANY($2)`,
        [new Date(), eventIds]
      );

      await client.query('COMMIT');

      return events.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Publica un evento al sistema de mensajería externo
   * Aquí puedes integrar con RabbitMQ, Kafka, SNS/SQS, etc.
   */
  private async publishEvent(event: OutboxEvent): Promise<void> {
    this.logger.info('Publishing event', {
      eventId: event.id,
      eventType: event.event_type,
      aggregateId: event.aggregate_id,
    });

    // TODO: Integrar con tu message broker real
    // Ejemplo: await this.messageBroker.publish(event.event_type, event.payload);

    // Por ahora solo logueamos
    this.logger.debug('Event published', { event });
  }

  /**
   * Procesa eventos pendientes una sola vez (útil para testing o jobs)
   */
  async processOnce(): Promise<number> {
    let totalProcessed = 0;
    let batchCount;

    do {
      batchCount = await this.processNextBatch();
      totalProcessed += batchCount;
    } while (batchCount > 0);

    return totalProcessed;
  }

  /**
   * Obtiene estadísticas del outbox
   */
  async getStats(): Promise<{
    pendingEvents: number;
    publishedEvents: number;
    oldestPendingEvent: Date | null;
  }> {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE published_at IS NULL) as pending,
         COUNT(*) FILTER (WHERE published_at IS NOT NULL) as published,
         MIN(created_at) FILTER (WHERE published_at IS NULL) as oldest_pending
       FROM outbox`
    );

    const row = result.rows[0];
    return {
      pendingEvents: parseInt(row.pending, 10),
      publishedEvents: parseInt(row.published, 10),
      oldestPendingEvent: row.oldest_pending ? new Date(row.oldest_pending) : null,
    };
  }

  /**
   * Limpia eventos antiguos ya publicados
   * Útil para mantener el tamaño de la tabla bajo control
   */
  async cleanupPublished(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.pool.query(
      `DELETE FROM outbox
       WHERE published_at IS NOT NULL
       AND published_at < $1`,
      [cutoffDate]
    );

    const deletedCount = result.rowCount ?? 0;
    this.logger.info('Cleanup completed', { deletedCount, olderThanDays });

    return deletedCount;
  }

  /**
   * Utility para dormir
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.pollTimeout = setTimeout(resolve, ms);
    });
  }
}
