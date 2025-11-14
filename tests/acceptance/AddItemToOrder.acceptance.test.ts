import { isNotFoundError, isValidationError } from '@application/errors/AppError.js';
import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase.js';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { StaticPricingService } from '@infrastructure/http/StaticPricingService.js';
import { NoopEventBus } from '@infrastructure/messaging/NoopEventBus.js';
import { InMemoryOrderRepository } from '@infrastructure/persistence/in-memory/InMemoryOrderRepository.js';
import { beforeEach, describe, expect, it } from 'vitest';

describe('AddItemToOrder - Acceptance Test', () => {
  let orderRepository: InMemoryOrderRepository;
  let pricingService: StaticPricingService;
  let eventBus: NoopEventBus;
  let createOrderUseCase: CreateOrderUseCase;
  let addItemToOrderUseCase: AddItemToOrderUseCase;

  beforeEach(() => {
    // Configurar adaptadores en memoria
    orderRepository = new InMemoryOrderRepository();
    pricingService = new StaticPricingService();
    eventBus = new NoopEventBus(false); // Sin logging en tests

    // Instanciar casos de uso
    createOrderUseCase = new CreateOrderUseCase(orderRepository, eventBus);
    addItemToOrderUseCase = new AddItemToOrderUseCase(orderRepository, pricingService, eventBus);
  });

  describe('Happy Path', () => {
    it('should add an item to an existing order', async () => {
      // Given: Un pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      // When: Agrego un item al pedido
      const addItemResult = await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 2,
      });

      // Then: El item se agrega correctamente con precio y total calculado
      expect(addItemResult.ok).toBe(true);
      if (!addItemResult.ok) return;

      const order = addItemResult.value;
      expect(order.items.length).toBe(1);
      expect(order.items[0].productId.value).toBe('LAPTOP-001');
      expect(order.items[0].quantity.value).toBe(2);
      expect(order.items[0].unitPrice.amount).toBe(1299.99);
      expect(order.items[0].unitPrice.currency.code).toBe('USD');

      const totalResult = order.calculateTotal();
      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        expect(totalResult.value.amount).toBeCloseTo(2599.98, 2);
      }
    });

    it('should add multiple items to an order', async () => {
      // Given: Un pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      // When: Agrego varios items diferentes al pedido
      await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 1,
      });

      await addItemToOrderUseCase.execute({
        orderId,
        productId: 'MOUSE-001',
        quantity: 2,
      });

      const result = await addItemToOrderUseCase.execute({
        orderId,
        productId: 'KEYBOARD-001',
        quantity: 1,
      });

      // Then: Todos los items se agregan y el total es correcto
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const order = result.value;
      expect(order.items.length).toBe(3);

      const totalResult = order.calculateTotal();
      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        // 1299.99 + (2 * 29.99) + 89.99 = 1449.96
        expect(totalResult.value.amount).toBeCloseTo(1449.96, 2);
      }
    });

    it('should increment quantity if same product is added twice', async () => {
      // Given: Un pedido con un item existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 2,
      });

      // When: Agrego el mismo producto de nuevo
      const result = await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 3,
      });

      // Then: La cantidad se incrementa en lugar de crear un nuevo item
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const order = result.value;
      expect(order.items.length).toBe(1);
      expect(order.items[0].quantity.value).toBe(5); // 2 + 3

      const totalResult = order.calculateTotal();
      expect(totalResult.ok).toBe(true);
      if (totalResult.ok) {
        // 5 * 1299.99 = 6499.95
        expect(totalResult.value.amount).toBeCloseTo(6499.95, 2);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should fail with invalid order ID', async () => {
      // Given: No hay contexto previo necesario

      // When: Intento agregar un item con orderId vacío
      const result = await addItemToOrderUseCase.execute({
        orderId: '',
        productId: 'LAPTOP-001',
        quantity: 1,
      });

      // Then: Debe fallar con error de validación en orderId
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('orderId');
        }
      }
    });

    it('should fail with invalid product ID', async () => {
      // Given: Un pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // When: Intento agregar un item con productId vacío
      const result = await addItemToOrderUseCase.execute({
        orderId: createResult.value.id.value,
        productId: '',
        quantity: 1,
      });

      // Then: Debe fallar con error de validación en productId
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('productId');
        }
      }
    });

    it('should fail with invalid quantity (zero)', async () => {
      // Given: Un pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // When: Intento agregar un item con cantidad cero
      const result = await addItemToOrderUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-001',
        quantity: 0,
      });

      // Then: Debe fallar con error de validación en quantity
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('quantity');
        }
      }
    });

    it('should fail with invalid quantity (negative)', async () => {
      // Given: Un pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // When: Intento agregar un item con cantidad negativa
      const result = await addItemToOrderUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-001',
        quantity: -5,
      });

      // Then: Debe fallar con error de validación en quantity
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('quantity');
        }
      }
    });
  });

  describe('Not Found Errors', () => {
    it('should fail when order does not exist', async () => {
      // Given: No existe un pedido con este ID

      // When: Intento agregar un item a un pedido inexistente
      const result = await addItemToOrderUseCase.execute({
        orderId: 'ORD-NONEXISTENT',
        productId: 'LAPTOP-001',
        quantity: 1,
      });

      // Then: Debe fallar con error NotFound
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isNotFoundError(result.error)).toBe(true);
        if (isNotFoundError(result.error)) {
          expect(result.error.resource).toBe('Order');
          expect(result.error.id).toBe('ORD-NONEXISTENT');
        }
      }
    });

    it('should fail when product does not exist in catalog', async () => {
      // Given: Un pedido existente pero un producto que no está en el catálogo
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // When: Intento agregar un producto inexistente
      const result = await addItemToOrderUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'NONEXISTENT-PRODUCT',
        quantity: 1,
      });

      // Then: Debe fallar con error NotFound
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isNotFoundError(result.error)).toBe(true);
        if (isNotFoundError(result.error)) {
          expect(result.error.resource).toBe('Product');
        }
      }
    });
  });

  describe('Domain Rules', () => {
    it('should reject items with different currencies', async () => {
      // Given: Un pedido con un item en USD
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      const firstItemResult = await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001', // USD
        quantity: 1,
      });
      expect(firstItemResult.ok).toBe(true);

      // When: Intento agregar un item en EUR (moneda diferente)
      const result = await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-002', // EUR
        quantity: 1,
      });

      // Then: Debe rechazar por incompatibilidad de monedas
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        expect(result.error.message).toContain('misma moneda');
      }
    });
  });

  describe('Event Publishing', () => {
    it('should publish OrderItemAdded event', async () => {
      // Given: Un pedido existente y bus de eventos limpio
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      eventBus.clear();

      // When: Agrego un item al pedido
      const result = await addItemToOrderUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-001',
        quantity: 1,
      });

      // Then: Debe publicarse el evento OrderItemAdded
      expect(result.ok).toBe(true);
      expect(eventBus.getEventCount()).toBe(1);

      const events = eventBus.getPublishedEvents();
      expect(events[0].constructor.name).toBe('OrderItemAdded');
    });

    it('should publish OrderItemQuantityIncreased event when incrementing', async () => {
      // Given: Un pedido con un item ya agregado
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 1,
      });

      eventBus.clear();

      // When: Agrego el mismo producto de nuevo (incrementando cantidad)
      const result = await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 2,
      });

      // Then: Debe publicarse el evento OrderItemQuantityIncreased
      expect(result.ok).toBe(true);
      expect(eventBus.getEventCount()).toBe(1);

      const events = eventBus.getPublishedEvents();
      expect(events[0].constructor.name).toBe('OrderItemQuantityIncreased');
    });
  });

  describe('Persistence', () => {
    it('should persist changes to the order', async () => {
      // Given: Un pedido recién creado
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      // When: Agrego un item al pedido
      await addItemToOrderUseCase.execute({
        orderId,
        productId: 'LAPTOP-001',
        quantity: 2,
      });

      // Then: Los cambios deben persistirse en el repositorio
      expect(orderRepository.count()).toBe(1);

      const orders = orderRepository.findAll();
      expect(orders[0].items.length).toBe(1);
      expect(orders[0].items[0].quantity.value).toBe(2);
    });
  });
});
