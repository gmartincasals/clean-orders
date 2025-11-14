import { DomainEvent } from '@domain/events/DomainEvent.js';

/**
 * Puerto: Bus de eventos
 * Define el contrato para publicar eventos de dominio
 */
export interface EventBus {
  /**
   * Publica un evento de dominio
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publica múltiples eventos de dominio
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}
