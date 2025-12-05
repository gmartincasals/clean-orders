import './setup.js';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase.js';
import { TestDatabase } from './helpers/testDatabase.js';
import { TestContainer } from './helpers/testContainer.js';

/**
 * E2E Smoke Tests para AddItemToOrder
 *
 * Estos tests verifican el flujo completo:
 * - Use case ejecuta lógica de negocio
 * - Order se actualiza en PostgreSQL
 * - Eventos se guardan en tabla outbox
 * - Pricing service obtiene precios
 * - Infraestructura real funciona correctamente
 */
describe('AddItemToOrder - E2E Smoke Tests', () => {
  let testDb: TestDatabase;
  let testContainer: TestContainer;
  let createOrderUseCase: CreateOrderUseCase;
  let addItemUseCase: AddItemToOrderUseCase;

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

    addItemUseCase = new AddItemToOrderUseCase(
      deps.orderRepository,
      deps.pricingService,
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
    it('should add item to order and persist to PostgreSQL', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({
        orderId: 'ORD-E2E-ITEM-001',
      });
      expect(createResult.ok).toBe(true);

      // When: Agrego un item
      const addItemDto = {
        orderId: 'ORD-E2E-ITEM-001',
        productId: 'LAPTOP-PRO',
        quantity: 2,
      };

      const result = await addItemUseCase.execute(addItemDto);

      // Then: El item se agrega exitosamente
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // And: El pedido se actualiza en PostgreSQL
      const savedOrder = await testDb.getOrder('ORD-E2E-ITEM-001');
      expect(savedOrder).not.toBeNull();
      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.items[0].product_id).toBe('LAPTOP-PRO');
      expect(savedOrder.items[0].quantity).toBe(2);
    });

    it('should persist ItemAdded event to outbox table', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({
        orderId: 'ORD-E2E-ITEM-002',
      });
      expect(createResult.ok).toBe(true);

      // Limpiar eventos de creación para enfocarnos en ItemAdded
      const eventsBefore = await testDb.getOutboxEvents();
      expect(eventsBefore.length).toBe(1); // Solo OrderCreated

      // When: Agrego un item
      const result = await addItemUseCase.execute({
        orderId: 'ORD-E2E-ITEM-002',
        productId: 'KEYBOARD-MECH',
        quantity: 1,
      });

      // Then: El item se agrega exitosamente
      expect(result.ok).toBe(true);

      // And: Se persiste el evento ItemAdded en outbox
      const eventsAfter = await testDb.getOutboxEvents();
      expect(eventsAfter.length).toBe(2); // OrderCreated + ItemAdded

      const itemAddedEvent = eventsAfter.find((e) => e.event_type === 'ItemAdded');
      expect(itemAddedEvent).toBeDefined();
      expect(itemAddedEvent!.published_at).toBeNull();
    });

    it('should use real pricing service for product prices', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({
        orderId: 'ORD-E2E-PRICING',
      });
      expect(createResult.ok).toBe(true);

      // When: Agrego un item (usa StaticPricingService real)
      const result = await addItemUseCase.execute({
        orderId: 'ORD-E2E-PRICING',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });

      // Then: El precio se obtiene del servicio real
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // StaticPricingService devuelve precios predefinidos
      expect(result.value.items[0].unitPrice.amount).toBeGreaterThan(0);
      expect(result.value.items[0].unitPrice.currency.code).toBe('USD');
    });

    it('should increment quantity when adding same product', async () => {
      // Given: Pedido con un item
      await createOrderUseCase.execute({ orderId: 'ORD-E2E-INCREMENT' });
      await addItemUseCase.execute({
        orderId: 'ORD-E2E-INCREMENT',
        productId: 'MOUSE-WIRELESS',
        quantity: 3,
      });

      // When: Agrego el mismo producto
      const result = await addItemUseCase.execute({
        orderId: 'ORD-E2E-INCREMENT',
        productId: 'MOUSE-WIRELESS',
        quantity: 2,
      });

      // Then: La cantidad se incrementa
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // And: PostgreSQL tiene la cantidad actualizada
      const savedOrder = await testDb.getOrder('ORD-E2E-INCREMENT');
      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.items[0].quantity).toBe(5); // 3 + 2
    });

    it('should handle multiple different products', async () => {
      // Given: Pedido existente
      await createOrderUseCase.execute({ orderId: 'ORD-E2E-MULTI-PROD' });

      // When: Agrego múltiples productos diferentes
      await addItemUseCase.execute({
        orderId: 'ORD-E2E-MULTI-PROD',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });

      await addItemUseCase.execute({
        orderId: 'ORD-E2E-MULTI-PROD',
        productId: 'MOUSE-WIRELESS',
        quantity: 2,
      });

      await addItemUseCase.execute({
        orderId: 'ORD-E2E-MULTI-PROD',
        productId: 'KEYBOARD-MECH',
        quantity: 1,
      });

      // Then: PostgreSQL tiene todos los productos
      const savedOrder = await testDb.getOrder('ORD-E2E-MULTI-PROD');
      expect(savedOrder.items).toHaveLength(3);

      // And: Se generan eventos para cada operación
      const events = await testDb.getOutboxEvents();
      const itemAddedEvents = events.filter((e) => e.event_type === 'ItemAdded');
      expect(itemAddedEvents.length).toBe(3);
    });
  });

  describe('Error Cases - End to End', () => {
    it('should fail when order does not exist in database', async () => {
      // Given: Pedido inexistente
      const dto = {
        orderId: 'ORD-E2E-NONEXISTENT',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Falla con error NotFound
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NotFoundError');
      }

      // And: No se crea ningún evento
      const events = await testDb.getOutboxEvents();
      expect(events.length).toBe(0);
    });

    it('should validate quantity at domain level', async () => {
      // Given: Pedido existente
      await createOrderUseCase.execute({ orderId: 'ORD-E2E-INVALID-QTY' });

      // When: Intento agregar item con cantidad inválida
      const result = await addItemUseCase.execute({
        orderId: 'ORD-E2E-INVALID-QTY',
        productId: 'LAPTOP-PRO',
        quantity: 0, // Cantidad inválida
      });

      // Then: Falla con error de validación
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ValidationError');
      }

      // And: El pedido no se modifica en PostgreSQL
      const savedOrder = await testDb.getOrder('ORD-E2E-INVALID-QTY');
      expect(savedOrder.items).toHaveLength(0);
    });
  });

  describe('Database Integrity', () => {
    it('should maintain consistent item state in PostgreSQL', async () => {
      // Given: Pedido con items
      await createOrderUseCase.execute({ orderId: 'ORD-E2E-CONSISTENCY' });
      await addItemUseCase.execute({
        orderId: 'ORD-E2E-CONSISTENCY',
        productId: 'LAPTOP-PRO',
        quantity: 2,
      });

      // When: Leo el pedido de PostgreSQL
      const savedOrder = await testDb.getOrder('ORD-E2E-CONSISTENCY');

      // Then: Los items tienen estructura correcta
      expect(savedOrder.items).toHaveLength(1);
      const item = savedOrder.items[0];

      expect(item.product_id).toBe('LAPTOP-PRO');
      expect(item.quantity).toBe(2);
      expect(item.unit_price).toBeDefined();
      expect(item.unit_price.amount).toBeGreaterThan(0);
      expect(item.unit_price.currency).toBe('USD');
    });

    it('should update updated_at timestamp when adding items', async () => {
      // Given: Pedido creado
      await createOrderUseCase.execute({ orderId: 'ORD-E2E-TIMESTAMP' });
      const orderBefore = await testDb.getOrder('ORD-E2E-TIMESTAMP');
      const createdAt = new Date(orderBefore.created_at);
      const updatedAtBefore = new Date(orderBefore.updated_at);

      // Esperar un poco para que el timestamp cambie
      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: Agrego un item
      await addItemUseCase.execute({
        orderId: 'ORD-E2E-TIMESTAMP',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });

      // Then: updated_at cambia, pero created_at no
      const orderAfter = await testDb.getOrder('ORD-E2E-TIMESTAMP');
      const updatedAtAfter = new Date(orderAfter.updated_at);

      expect(orderAfter.created_at).toEqual(orderBefore.created_at);
      expect(updatedAtAfter.getTime()).toBeGreaterThan(updatedAtBefore.getTime());
    });

    it('should store all events in correct order in outbox', async () => {
      // Given: Pedido con múltiples operaciones
      await createOrderUseCase.execute({ orderId: 'ORD-E2E-EVENT-ORDER' });
      await addItemUseCase.execute({
        orderId: 'ORD-E2E-EVENT-ORDER',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });
      await addItemUseCase.execute({
        orderId: 'ORD-E2E-EVENT-ORDER',
        productId: 'MOUSE-WIRELESS',
        quantity: 2,
      });

      // When: Leo eventos de la outbox
      const events = await testDb.getOutboxEvents();

      // Then: Los eventos están en orden correcto
      expect(events).toHaveLength(3);
      expect(events[0].event_type).toBe('OrderCreated');
      expect(events[1].event_type).toBe('ItemAdded');
      expect(events[2].event_type).toBe('ItemAdded');

      // And: Todos sin publicar
      events.forEach((event) => {
        expect(event.published_at).toBeNull();
      });
    });
  });
});
