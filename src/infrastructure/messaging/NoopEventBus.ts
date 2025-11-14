import { EventBus } from '@application/ports/EventBus.js';
import { DomainEvent } from '@domain/events/DomainEvent.js';

/**
 * Implementación no-op (No Operation) del bus de eventos
 * Simula la publicación de eventos sin hacer nada real
 * Útil para desarrollo, testing y cuando no se necesita procesamiento de eventos
 */
export class NoopEventBus implements EventBus {
  private readonly publishedEvents: DomainEvent[] = [];
  private readonly shouldLog: boolean;

  constructor(shouldLog: boolean = false) {
    this.shouldLog = shouldLog;
  }

  async publish(event: DomainEvent): Promise<void> {
    // Registrar el evento publicado
    this.publishedEvents.push(event);

    // Opcionalmente logear para debugging
    if (this.shouldLog) {
      console.log(`[NoopEventBus] Event published:`, {
        type: event.constructor.name,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        data: event.toPrimitives(),
      });
    }

    // Simular latencia de red
    await this.simulatePublishDelay();
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Métodos adicionales útiles para testing y debugging
   */

  /**
   * Obtiene todos los eventos publicados
   */
  getPublishedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.publishedEvents];
  }

  /**
   * Obtiene eventos de un tipo específico
   */
  getEventsByType<T extends DomainEvent>(eventType: new (...args: any[]) => T): T[] {
    return this.publishedEvents.filter((event) => event instanceof eventType) as T[];
  }

  /**
   * Obtiene eventos de un agregado específico
   */
  getEventsByAggregateId(aggregateId: string): DomainEvent[] {
    return this.publishedEvents.filter((event) => event.aggregateId === aggregateId);
  }

  /**
   * Cuenta los eventos publicados
   */
  getEventCount(): number {
    return this.publishedEvents.length;
  }

  /**
   * Limpia todos los eventos publicados
   */
  clear(): void {
    this.publishedEvents.length = 0;
  }

  /**
   * Verifica si se publicó un evento específico
   */
  hasEvent(predicate: (event: DomainEvent) => boolean): boolean {
    return this.publishedEvents.some(predicate);
  }

  /**
   * Simula la latencia de publicación en un message broker real
   */
  private async simulatePublishDelay(): Promise<void> {
    const delay = Math.random() * 20 + 5; // 5-25ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
