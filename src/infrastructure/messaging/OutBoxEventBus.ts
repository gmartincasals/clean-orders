import { EventBus } from '@application/ports/EventBus.js';
import { DomainEvent } from '@domain/events/DomainEvent.js';
import pg from 'pg';

/**
 * EventBus que implementa el patrón Transactional Outbox
 * Persiste eventos en una tabla outbox en la misma transacción que los datos de negocio
 * para garantizar consistencia eventual
 */
export class OutboxEventBus implements EventBus {
  constructor(private readonly client: pg.PoolClient | pg.Pool) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventType = event.constructor.name;
    const payload = {
      occurredAt: event.occurredAt.toISOString(),
      ...event.toPrimitives(),
    };

    await this.client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        this.extractAggregateType(eventType),
        event.aggregateId,
        eventType,
        JSON.stringify(payload),
        new Date(),
      ]
    );
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Extrae el tipo de agregado del nombre del evento
   * Por ejemplo: OrderCreated -> Order
   */
  private extractAggregateType(eventType: string): string {
    // Remueve sufijos comunes de eventos (Created, Updated, Deleted, etc.)
    return eventType.replace(/(Created|Updated|Deleted|Added|Removed|Changed|Increased|Decreased)$/, '');
  }
}
