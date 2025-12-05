import './setup.js';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { OutboxDispatcher } from '@infrastructure/messaging/OutboxDispatcher.js';
import { TestDatabase } from './helpers/testDatabase.js';
import { TestContainer } from './helpers/testContainer.js';
import { config } from '@composition/config.js';

/**
 * E2E Smoke Tests para OutboxDispatcher
 *
 * Estos tests verifican:
 * - Los eventos se persisten en la tabla outbox
 * - El dispatcher procesa eventos con FOR UPDATE SKIP LOCKED
 * - Los eventos se marcan como publicados (published_at)
 * - El dispatcher puede ejecutarse de forma concurrente sin conflictos
 */
describe('OutboxDispatcher - E2E Smoke Tests', () => {
  let testDb: TestDatabase;
  let testContainer: TestContainer;
  let createOrderUseCase: CreateOrderUseCase;
  let dispatcher: OutboxDispatcher;

  beforeAll(async () => {
    // Setup: Inicializar infraestructura real
    testDb = new TestDatabase();
    testContainer = new TestContainer();
    await testContainer.initialize();

    const deps = testContainer.getDependencies();
    createOrderUseCase = new CreateOrderUseCase(
      deps.orderRepository,
      deps.eventBus,
      deps.logger
    );

    // Crear dispatcher
    dispatcher = new OutboxDispatcher({
      connectionString: config.DATABASE_URL,
      batchSize: 10,
      pollIntervalMs: 1000,
      logger: deps.logger,
    });
  });

  afterAll(async () => {
    // Cleanup: Cerrar conexiones
    await dispatcher.stop();
    await testContainer.close();
    await testDb.close();
  });

  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    await testDb.clean();
  });

  describe('Event Processing - processOnce', () => {
    it('should process unpublished events and mark them as published', async () => {
      // Given: Varios eventos sin publicar
      await createOrderUseCase.execute({ orderId: 'ORD-DISP-001' });
      await createOrderUseCase.execute({ orderId: 'ORD-DISP-002' });
      await createOrderUseCase.execute({ orderId: 'ORD-DISP-003' });

      // Verificar que hay eventos sin publicar
      const unpublishedBefore = await testDb.getUnpublishedEvents();
      expect(unpublishedBefore.length).toBe(3);

      // When: Ejecuto el dispatcher una vez
      const processedCount = await dispatcher.processOnce();

      // Then: Se procesan todos los eventos
      expect(processedCount).toBe(3);

      // And: Los eventos se marcan como publicados
      const unpublishedAfter = await testDb.getUnpublishedEvents();
      expect(unpublishedAfter.length).toBe(0);

      // And: Todos los eventos tienen published_at
      const allEvents = await testDb.getOutboxEvents();
      expect(allEvents.length).toBe(3);
      allEvents.forEach((event) => {
        expect(event.published_at).not.toBeNull();
      });
    });

    it('should process events in batches', async () => {
      // Given: Más eventos que el tamaño del batch
      const dispatcher = new OutboxDispatcher({
        connectionString: config.DATABASE_URL,
        batchSize: 2, // Batch pequeño para testing
        logger: testContainer.getDependencies().logger,
      });

      // Crear 5 eventos
      for (let i = 1; i <= 5; i++) {
        await createOrderUseCase.execute({ orderId: `ORD-BATCH-${i}` });
      }

      // When: Ejecuto processOnce (procesa hasta vaciar)
      const processedCount = await dispatcher.processOnce();

      // Then: Se procesan todos los eventos (en múltiples batches)
      expect(processedCount).toBe(5);

      // And: Todos marcados como publicados
      const unpublished = await testDb.getUnpublishedEvents();
      expect(unpublished.length).toBe(0);

      await dispatcher.stop();
    });

    it('should return 0 when no events to process', async () => {
      // Given: Sin eventos pendientes
      const unpublished = await testDb.getUnpublishedEvents();
      expect(unpublished.length).toBe(0);

      // When: Ejecuto el dispatcher
      const processedCount = await dispatcher.processOnce();

      // Then: No procesa nada
      expect(processedCount).toBe(0);
    });

    it('should process only unpublished events', async () => {
      // Given: Eventos ya publicados
      await createOrderUseCase.execute({ orderId: 'ORD-ALREADY-PUB' });
      await dispatcher.processOnce();

      // Y un evento nuevo sin publicar
      await createOrderUseCase.execute({ orderId: 'ORD-NEW-UNPUB' });

      // When: Ejecuto el dispatcher de nuevo
      const processedCount = await dispatcher.processOnce();

      // Then: Solo procesa el nuevo evento
      expect(processedCount).toBe(1);

      // And: Ahora todos están publicados
      const unpublished = await testDb.getUnpublishedEvents();
      expect(unpublished.length).toBe(0);
    });
  });

  describe('Event Order and Integrity', () => {
    it('should process events in creation order (FIFO)', async () => {
      // Given: Eventos creados en orden específico
      const orderIds = ['ORD-FIRST', 'ORD-SECOND', 'ORD-THIRD'];

      for (const orderId of orderIds) {
        await createOrderUseCase.execute({ orderId });
        // Pequeña espera para garantizar orden
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      // When: Proceso los eventos
      await dispatcher.processOnce();

      // Then: Los eventos se procesaron en orden
      const events = await testDb.getOutboxEvents();
      expect(events.length).toBe(3);

      // Verificar orden por created_at
      const sortedEvents = events.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const payloads = sortedEvents.map((e) => JSON.parse(e.payload));
      expect(payloads[0].orderId).toBe('ORD-FIRST');
      expect(payloads[1].orderId).toBe('ORD-SECOND');
      expect(payloads[2].orderId).toBe('ORD-THIRD');
    });

    it('should preserve event payload integrity', async () => {
      // Given: Pedido creado
      await createOrderUseCase.execute({ orderId: 'ORD-PAYLOAD-TEST' });

      // When: Proceso el evento
      await dispatcher.processOnce();

      // Then: El payload se preserva correctamente
      const events = await testDb.getOutboxEvents();
      expect(events.length).toBe(1);

      const payload = JSON.parse(events[0].payload);
      expect(payload.orderId).toBe('ORD-PAYLOAD-TEST');
      expect(payload.occurredAt).toBeDefined();
      expect(events[0].event_type).toBe('OrderCreated');
      expect(events[0].aggregate_id).toBe('order.created');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', async () => {
      // Given: Estado inicial
      const statsInitial = await dispatcher.getStats();
      expect(statsInitial.pendingEvents).toBe(0);
      expect(statsInitial.publishedEvents).toBe(0);

      // When: Creo eventos y proceso algunos
      await createOrderUseCase.execute({ orderId: 'ORD-STATS-1' });
      await createOrderUseCase.execute({ orderId: 'ORD-STATS-2' });
      await createOrderUseCase.execute({ orderId: 'ORD-STATS-3' });

      const statsPending = await dispatcher.getStats();
      expect(statsPending.pendingEvents).toBe(3);
      expect(statsPending.publishedEvents).toBe(0);
      expect(statsPending.oldestPendingEvent).not.toBeNull();

      // Proceso 2 eventos (usando dispatcher con batch=2)
      const smallBatchDispatcher = new OutboxDispatcher({
        connectionString: config.DATABASE_URL,
        batchSize: 2,
        logger: testContainer.getDependencies().logger,
      });

      await smallBatchDispatcher.processOnce();

      // Then: Las estadísticas reflejan el estado actual
      const statsAfter = await dispatcher.getStats();
      expect(statsAfter.pendingEvents).toBe(0);
      expect(statsAfter.publishedEvents).toBe(3);

      await smallBatchDispatcher.stop();
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old published events', async () => {
      // Given: Eventos publicados
      await createOrderUseCase.execute({ orderId: 'ORD-CLEANUP-1' });
      await createOrderUseCase.execute({ orderId: 'ORD-CLEANUP-2' });
      await dispatcher.processOnce();

      // Verificar que hay eventos publicados
      const stats = await dispatcher.getStats();
      expect(stats.publishedEvents).toBe(2);

      // When: Ejecuto cleanup (con 0 días para borrar todos)
      const deletedCount = await dispatcher.cleanupPublished(0);

      // Then: Los eventos se eliminan
      expect(deletedCount).toBe(2);

      const statsAfter = await dispatcher.getStats();
      expect(statsAfter.publishedEvents).toBe(0);
    });

    it('should not cleanup unpublished events', async () => {
      // Given: Eventos sin publicar
      await createOrderUseCase.execute({ orderId: 'ORD-KEEP-UNPUB' });

      const statsBefore = await dispatcher.getStats();
      expect(statsBefore.pendingEvents).toBe(1);

      // When: Ejecuto cleanup
      const deletedCount = await dispatcher.cleanupPublished(0);

      // Then: No se eliminan eventos sin publicar
      expect(deletedCount).toBe(0);

      const statsAfter = await dispatcher.getStats();
      expect(statsAfter.pendingEvents).toBe(1);
    });
  });

  describe('FOR UPDATE SKIP LOCKED Behavior', () => {
    it('should handle concurrent processing without conflicts', async () => {
      // Given: Múltiples eventos
      for (let i = 1; i <= 10; i++) {
        await createOrderUseCase.execute({ orderId: `ORD-CONCURRENT-${i}` });
      }

      // When: Dos dispatchers procesan en paralelo
      const dispatcher1 = new OutboxDispatcher({
        connectionString: config.DATABASE_URL,
        batchSize: 5,
        logger: testContainer.getDependencies().logger,
      });

      const dispatcher2 = new OutboxDispatcher({
        connectionString: config.DATABASE_URL,
        batchSize: 5,
        logger: testContainer.getDependencies().logger,
      });

      // Ejecutar ambos dispatchers en paralelo
      const [count1, count2] = await Promise.all([
        dispatcher1.processOnce(),
        dispatcher2.processOnce(),
      ]);

      // Then: Entre los dos procesan todos los eventos sin duplicados
      expect(count1 + count2).toBe(10);

      // And: No quedan eventos sin publicar
      const unpublished = await testDb.getUnpublishedEvents();
      expect(unpublished.length).toBe(0);

      // And: Cada evento se procesó exactamente una vez
      const allEvents = await testDb.getOutboxEvents();
      expect(allEvents.length).toBe(10);
      allEvents.forEach((event) => {
        expect(event.published_at).not.toBeNull();
      });

      await dispatcher1.stop();
      await dispatcher2.stop();
    });
  });
});
