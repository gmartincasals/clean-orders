/**
 * Clase base abstracta para todos los eventos de dominio
 */
export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: string;

  protected constructor(aggregateId: string) {
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
  }

  abstract toPrimitives(): Record<string, unknown>;
}
