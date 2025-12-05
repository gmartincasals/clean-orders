import './setup.js';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { TestDatabase } from './helpers/testDatabase.js';
import { TestContainer } from './helpers/testContainer.js';

/**
 * E2E Smoke Tests para CreateOrder
 *
 * Estos tests verifican el flujo completo:
 * - Use case ejecuta lógica de negocio
 * - Order se persiste en PostgreSQL
 * - Eventos se guardan en tabla outbox
 * - Infraestructura real funciona correctamente
 */
describe('CreateOrder - E2E Smoke Tests', () => {
  let testDb: TestDatabase;
  let testContainer: TestContainer;
  let useCase: CreateOrderUseCase;

  beforeAll(async () => {
    // Setup: Inicializar infraestructura real
    testDb = new TestDatabase();
    testContainer = new TestContainer();
    await testContainer.initialize();

    const deps = testContainer.getDependencies();
    useCase = new CreateOrderUseCase(
      deps.orderRepository,
      deps.eventBus,
      deps.logger
    );
  });

  afterAll(async () => {
    // Cleanup: Cerrar conexiones
    await testContainer.close();
    await testDb.close();
  });

  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    await testDb.clean();
  });

  describe('Happy Path - End to End', () => {
    it('should create order and persist to PostgreSQL', async () => {
      // Given: DTO de creación
      const dto = {
        orderId: 'ORD-E2E-001',
      };

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: El caso de uso retorna éxito
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // And: El pedido se persiste en PostgreSQL
      const savedOrder = await testDb.getOrder('ORD-E2E-001');
      expect(savedOrder).not.toBeNull();
      expect(savedOrder.id).toBe('ORD-E2E-001');
      expect(savedOrder.items).toEqual([]);
    });

    it('should persist OrderCreated event to outbox table', async () => {
      // Given: DTO de creación
      const dto = {
        orderId: 'ORD-E2E-002',
      };

      // When: Creo el pedido
      const result = await useCase.execute(dto);

      // Then: El pedido se crea exitosamente
      expect(result.ok).toBe(true);

      // And: El evento se persiste en la tabla outbox
      const events = await testDb.getOutboxEvents();
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe('OrderCreated');
      expect(events[0].aggregate_id).toBe('order.created');
      expect(events[0].published_at).toBeNull(); // No publicado aún
    });

    it('should generate order ID when not provided', async () => {
      // Given: DTO sin orderId
      const dto = {};

      // When: Creo el pedido
      const result = await useCase.execute(dto);

      // Then: Se genera un ID automáticamente
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id.value).toMatch(/^ORD-/);

      // And: Se persiste en PostgreSQL con el ID generado
      const count = await testDb.countOrders();
      expect(count).toBe(1);
    });

    it('should handle multiple orders independently', async () => {
      // Given: Múltiples pedidos
      const orders = [
        { orderId: 'ORD-E2E-MULTI-1' },
        { orderId: 'ORD-E2E-MULTI-2' },
        { orderId: 'ORD-E2E-MULTI-3' },
      ];

      // When: Creo los pedidos
      for (const dto of orders) {
        const result = await useCase.execute(dto);
        expect(result.ok).toBe(true);
      }

      // Then: Todos se persisten en PostgreSQL
      const count = await testDb.countOrders();
      expect(count).toBe(3);

      // And: Se generan 3 eventos en outbox
      const events = await testDb.getOutboxEvents();
      expect(events.length).toBe(3);
    });
  });

  describe('Error Cases - End to End', () => {
    it('should reject duplicate order IDs at database level', async () => {
      // Given: Pedido existente
      const dto = { orderId: 'ORD-E2E-DUPLICATE' };
      await useCase.execute(dto);

      // When: Intento crear pedido con mismo ID
      const result = await useCase.execute(dto);

      // Then: Falla con error de conflicto
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ConflictError');
      }

      // And: Solo hay un pedido en la base de datos
      const count = await testDb.countOrders();
      expect(count).toBe(1);
    });

    it('should not create outbox event when order creation fails', async () => {
      // Given: Pedido existente
      const dto = { orderId: 'ORD-E2E-NO-EVENT' };
      await useCase.execute(dto);

      const eventsBefore = await testDb.getOutboxEvents();
      expect(eventsBefore.length).toBe(1);

      // When: Intento crear duplicado
      await useCase.execute(dto);

      // Then: No se crea nuevo evento (sigue siendo 1)
      const eventsAfter = await testDb.getOutboxEvents();
      expect(eventsAfter.length).toBe(1);
    });
  });

  describe('Database Integrity', () => {
    it('should maintain consistent state in PostgreSQL', async () => {
      // Given: Pedido creado
      const dto = { orderId: 'ORD-E2E-INTEGRITY' };
      await useCase.execute(dto);

      // When: Leo el pedido de la base de datos
      const savedOrder = await testDb.getOrder('ORD-E2E-INTEGRITY');

      // Then: Los datos son consistentes
      expect(savedOrder.id).toBe('ORD-E2E-INTEGRITY');
      expect(savedOrder.items).toEqual([]);
      expect(savedOrder.created_at).toBeDefined();
      expect(savedOrder.updated_at).toBeDefined();

      // And: El evento en outbox referencia al pedido correcto
      const events = await testDb.getOutboxEvents();
      const payload = JSON.parse(events[0].payload);
      expect(payload.orderId).toBe('ORD-E2E-INTEGRITY');
    });

    it('should store unpublished events ready for dispatcher', async () => {
      // Given: Varios pedidos creados
      await useCase.execute({ orderId: 'ORD-E2E-UNPUB-1' });
      await useCase.execute({ orderId: 'ORD-E2E-UNPUB-2' });

      // When: Consulto eventos sin publicar
      const unpublished = await testDb.getUnpublishedEvents();

      // Then: Todos los eventos están sin publicar
      expect(unpublished.length).toBe(2);
      unpublished.forEach((event) => {
        expect(event.published_at).toBeNull();
        expect(event.event_type).toBe('OrderCreated');
      });
    });
  });
});
