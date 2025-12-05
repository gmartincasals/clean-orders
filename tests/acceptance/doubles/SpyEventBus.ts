import { DomainEvent } from '@domain/events/DomainEvent.js';
import { EventBus } from '@application/ports/EventBus.js';

/**
 * Spy EventBus - Registra todas las llamadas para verificación
 * No afecta el comportamiento, solo observa
 */
export class SpyEventBus implements EventBus {
  private publishedEvents: DomainEvent[] = [];
  private publishCalls: number = 0;
  private publishAllCalls: number = 0;

  async publish(event: DomainEvent): Promise<void> {
    this.publishCalls++;
    this.publishedEvents.push(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.publishAllCalls++;
    this.publishedEvents.push(...events);
  }

  // Métodos de inspección
  getPublishedEvents(): DomainEvent[] {
    return [...this.publishedEvents];
  }

  getEventCount(): number {
    return this.publishedEvents.length;
  }

  getPublishCalls(): number {
    return this.publishCalls;
  }

  getPublishAllCalls(): number {
    return this.publishAllCalls;
  }

  getEventsByType(eventType: string): DomainEvent[] {
    return this.publishedEvents.filter((e) => e.constructor.name === eventType);
  }

  wasPublished(eventType: string): boolean {
    return this.getEventsByType(eventType).length > 0;
  }

  clear(): void {
    this.publishedEvents = [];
    this.publishCalls = 0;
    this.publishAllCalls = 0;
  }
}
