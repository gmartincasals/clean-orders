import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase.js';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { isNotFoundError, isValidationError, isInfraError } from '@application/errors/AppError.js';
import {
  SpyEventBus,
  StubPricingService,
  FakeOrderRepository,
  SpyLogger,
} from './doubles/index.js';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Tests de Aceptación Mejorados para AddItemToOrder
 * - Entrada/Salida con DTOs planos
 * - Errores tipados y específicos
 * - Test Doubles: Spy, Stub, Fake
 * - Sin imports de implementaciones concretas en los tests
 */
describe('AddItemToOrder - Improved Acceptance Tests', () => {
  let orderRepository: FakeOrderRepository;
  let pricingService: StubPricingService;
  let eventBus: SpyEventBus;
  let logger: SpyLogger;
  let createOrderUseCase: CreateOrderUseCase;
  let addItemUseCase: AddItemToOrderUseCase;

  beforeEach(() => {
    // Setup test doubles
    orderRepository = new FakeOrderRepository();
    pricingService = new StubPricingService();
    eventBus = new SpyEventBus();
    logger = new SpyLogger();

    // Setup use cases
    createOrderUseCase = new CreateOrderUseCase(orderRepository, eventBus, logger);
    addItemUseCase = new AddItemToOrderUseCase(
      orderRepository,
      pricingService, // StubPricingService ahora implementa getPrices
      eventBus,
      logger
    );

    // Configure stub pricing service with default products
    pricingService.setPriceInUSD('LAPTOP-PRO', 1499.99);
    pricingService.setPriceInUSD('MOUSE-WIRELESS', 79.99);
    pricingService.setPriceInUSD('KEYBOARD-MECH', 149.99);
    pricingService.setPriceInUSD('MONITOR-4K', 599.99);
  });

  describe('Happy Path', () => {
    it('should add item with data from DTO', async () => {
      // Given: Pedido existente (DTO plano)
      const createResult = await createOrderUseCase.execute({
        orderId: 'ORD-DTO-001',
      });
      expect(createResult.ok).toBe(true);

      // When: Agrego item con DTO plano
      const dto = {
        orderId: 'ORD-DTO-001',
        productId: 'LAPTOP-PRO',
        quantity: 2,
      };

      const result = await addItemUseCase.execute(dto);

      // Then: Item agregado correctamente
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.items.length).toBe(1);
      expect(result.value.items[0].productId.value).toBe('LAPTOP-PRO');
      expect(result.value.items[0].quantity.value).toBe(2);
      expect(result.value.items[0].unitPrice.amount).toBe(1499.99);
    });

    it('should use stub pricing service for price lookup', async () => {
      // Given: Precio configurado en el stub
      pricingService.setPriceInUSD('CUSTOM-PRODUCT', 999.99);

      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      // When: Agrego el producto
      const dto = {
        orderId,
        productId: 'CUSTOM-PRODUCT',
        quantity: 1,
      };

      const result = await addItemUseCase.execute(dto);

      // Then: Usa el precio del stub
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.items[0].unitPrice.amount).toBe(999.99);
    });

    it('should save order after adding item', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({
        orderId: 'ORD-SAVE-TEST',
      });
      expect(createResult.ok).toBe(true);

      const saveCallsBefore = orderRepository.getSaveCalls();

      // When: Agrego un item
      const dto = {
        orderId: 'ORD-SAVE-TEST',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      await addItemUseCase.execute(dto);

      // Then: Se guarda el pedido (1 save adicional)
      expect(orderRepository.getSaveCalls()).toBe(saveCallsBefore + 1);
    });

    it('should publish OrderItemAdded event using spy', async () => {
      // Given: Pedido existente y event bus limpio
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      eventBus.clear();

      // When: Agrego un item
      const dto = {
        orderId: createResult.value.id.value,
        productId: 'MOUSE-WIRELESS',
        quantity: 3,
      };

      await addItemUseCase.execute(dto);

      // Then: Evento publicado y registrado por el spy
      expect(eventBus.getEventCount()).toBe(1);
      expect(eventBus.wasPublished('OrderItemAdded')).toBe(true);

      const events = eventBus.getEventsByType('OrderItemAdded');
      expect(events.length).toBe(1);
    });

    it('should log operation using spy logger', async () => {
      // Given: Pedido existente y logger limpio
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      logger.clear();

      // When: Agrego un item
      const dto = {
        orderId: createResult.value.id.value,
        productId: 'KEYBOARD-MECH',
        quantity: 1,
      };

      await addItemUseCase.execute(dto);

      // Then: Operación logueada
      expect(logger.hasLoggedMessage('Adding item to order')).toBe(true);
      expect(logger.hasLoggedMessage('Item added to order successfully')).toBe(true);
      expect(logger.getInfoLogs().length).toBeGreaterThan(0);
    });

    it('should increment quantity when adding same product twice', async () => {
      // Given: Pedido con un item ya agregado
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      await addItemUseCase.execute({
        orderId,
        productId: 'LAPTOP-PRO',
        quantity: 2,
      });

      eventBus.clear();

      // When: Agrego el mismo producto de nuevo
      const result = await addItemUseCase.execute({
        orderId,
        productId: 'LAPTOP-PRO',
        quantity: 3,
      });

      // Then: Cantidad incrementada (no nuevo item)
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.items.length).toBe(1);
      expect(result.value.items[0].quantity.value).toBe(5); // 2 + 3

      // Y evento OrderItemQuantityIncreased
      expect(eventBus.wasPublished('OrderItemQuantityIncreased')).toBe(true);
    });

    it('should add multiple different items', async () => {
      // Given: Pedido vacío
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      // When: Agrego múltiples productos diferentes
      await addItemUseCase.execute({
        orderId,
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });

      await addItemUseCase.execute({
        orderId,
        productId: 'MOUSE-WIRELESS',
        quantity: 2,
      });

      const result = await addItemUseCase.execute({
        orderId,
        productId: 'KEYBOARD-MECH',
        quantity: 1,
      });

      // Then: 3 items diferentes
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.items.length).toBe(3);
    });
  });

  describe('Validation Errors - DTOs', () => {
    it('should fail with ValidationError when orderId is empty', async () => {
      // Given: DTO con orderId vacío
      const dto = {
        orderId: '',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error de validación tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.type).toBe('ValidationError');
          expect(result.error.field).toBe('orderId');
        }
      }
    });

    it('should fail with ValidationError when productId is empty', async () => {
      // Given: Pedido existente pero DTO con productId vacío
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const dto = {
        orderId: createResult.value.id.value,
        productId: '',
        quantity: 1,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error de validación tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('productId');
        }
      }
    });

    it('should fail with ValidationError when quantity is zero', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // DTO con cantidad cero
      const dto = {
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-PRO',
        quantity: 0,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error de validación tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('quantity');
        }
      }
    });

    it('should fail with ValidationError when quantity is negative', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const dto = {
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-PRO',
        quantity: -5,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error de validación
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
      }
    });

    it('should log validation errors', async () => {
      // Given: DTO inválido
      const dto = {
        orderId: '',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      logger.clear();

      // When: Intento agregar item
      await addItemUseCase.execute(dto);

      // Then: Error logueado
      expect(logger.getWarnLogs().length).toBeGreaterThan(0);
      expect(logger.hasLoggedMessage('Invalid order ID')).toBe(true);
    });
  });

  describe('NotFound Errors', () => {
    it('should fail with NotFoundError when order does not exist', async () => {
      // Given: DTO con orderId inexistente
      const dto = {
        orderId: 'ORD-NONEXISTENT',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error NotFound tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isNotFoundError(result.error)).toBe(true);
        if (isNotFoundError(result.error)) {
          expect(result.error.type).toBe('NotFoundError');
          expect(result.error.resource).toBe('Order');
          expect(result.error.id).toBe('ORD-NONEXISTENT');
        }
      }
    });

    it('should use default price when specific product price not configured', async () => {
      // Given: Pedido existente y producto sin precio específico
      // Note: StubPricingService tiene precio DEFAULT configurado en constructor
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // No configuramos precio para este producto, usará el DEFAULT
      const dto = {
        orderId: createResult.value.id.value,
        productId: 'UNKNOWN-PRODUCT',
        quantity: 1,
      };

      // When: Agrego el item
      const result = await addItemUseCase.execute(dto);

      // Then: Usa el precio por defecto del stub (99.99 USD)
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items[0].unitPrice.amount).toBe(99.99);
      }
    });

    it('should log not found errors', async () => {
      // Given: Pedido inexistente
      const dto = {
        orderId: 'ORD-MISSING',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      logger.clear();

      // When: Intento agregar item
      await addItemUseCase.execute(dto);

      // Then: Error logueado
      expect(logger.hasLoggedMessage('Order not found')).toBe(true);
      expect(logger.getWarnLogs().length).toBeGreaterThan(0);
    });
  });

  describe('Business Rules Validation', () => {
    it('should reject items with different currencies', async () => {
      // Given: Pedido con un item en USD
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orderId = createResult.value.id.value;

      await addItemUseCase.execute({
        orderId,
        productId: 'LAPTOP-PRO', // USD
        quantity: 1,
      });

      // Configurar producto en EUR en el stub
      pricingService.setPriceInEUR('MONITOR-EUR', 499.99);

      // When: Intento agregar item en EUR
      const result = await addItemUseCase.execute({
        orderId,
        productId: 'MONITOR-EUR',
        quantity: 1,
      });

      // Then: Rechazado por incompatibilidad de monedas
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        expect(result.error.message).toContain('misma moneda');
      }
    });
  });

  describe('Infrastructure Errors', () => {
    it('should fail with InfraError when repository find fails', async () => {
      // Given: Repositorio configurado para fallar en find
      orderRepository.simulateFindFailure();

      const dto = {
        orderId: 'ORD-FIND-FAIL',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error de infraestructura tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isInfraError(result.error)).toBe(true);
        if (isInfraError(result.error)) {
          expect(result.error.type).toBe('InfraError');
          expect(result.error.message).toContain('Error al recuperar el pedido');
        }
      }
    });

    it('should fail with InfraError when repository save fails', async () => {
      // Given: Pedido existente pero repositorio falla al guardar
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      orderRepository.simulateSaveFailure();

      const dto = {
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      // When: Intento agregar item
      const result = await addItemUseCase.execute(dto);

      // Then: Error de infraestructura
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isInfraError(result.error)).toBe(true);
        expect(result.error.message).toContain('Error al persistir los cambios');
      }
    });

    it('should log infrastructure errors', async () => {
      // Given: Repositorio que falla
      orderRepository.simulateFindFailure();
      const dto = {
        orderId: 'ORD-ERROR',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      logger.clear();

      // When: Intento agregar item
      await addItemUseCase.execute(dto);

      // Then: Error logueado
      expect(logger.getErrorLogs().length).toBeGreaterThan(0);
    });

    it('should not publish events when operation fails', async () => {
      // Given: Operación que va a fallar (orden inexistente)
      const dto = {
        orderId: 'ORD-NO-EXIST',
        productId: 'LAPTOP-PRO',
        quantity: 1,
      };

      eventBus.clear();

      // When: Intento agregar item
      await addItemUseCase.execute(dto);

      // Then: No se publican eventos
      expect(eventBus.getEventCount()).toBe(0);
    });
  });

  describe('Test Doubles Verification', () => {
    it('should verify spy event bus was called', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      eventBus.clear();

      // When: Agrego item
      await addItemUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });

      // Then: Verifico que el spy registró la llamada
      expect(eventBus.getPublishAllCalls()).toBe(1);
      expect(eventBus.getEventCount()).toBe(1);
    });

    it('should verify stub pricing service was consulted', async () => {
      // Given: Precio específico en el stub
      pricingService.setPriceInUSD('SPECIAL-ITEM', 12345.67);

      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // When: Agrego el item
      const result = await addItemUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'SPECIAL-ITEM',
        quantity: 1,
      });

      // Then: El precio viene del stub
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.items[0].unitPrice.amount).toBe(12345.67);
    });

    it('should verify fake repository counts operations', async () => {
      // Given: Pedido existente
      const createResult = await createOrderUseCase.execute({});
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const findCallsBefore = orderRepository.getFindByIdCalls();
      const saveCallsBefore = orderRepository.getSaveCalls();

      // When: Agrego item
      await addItemUseCase.execute({
        orderId: createResult.value.id.value,
        productId: 'LAPTOP-PRO',
        quantity: 1,
      });

      // Then: Fake registró las operaciones
      expect(orderRepository.getFindByIdCalls()).toBe(findCallsBefore + 1);
      expect(orderRepository.getSaveCalls()).toBe(saveCallsBefore + 1);
    });
  });
});
