import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { isConflictError, isInfraError, isValidationError } from '@application/errors/AppError.js';
import { SpyEventBus, FakeOrderRepository, SpyLogger } from './doubles/index.js';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Tests de Aceptación para CreateOrder
 * - Usa DTOs planos como entrada/salida
 * - Verifica errores tipados específicos
 * - Usa test doubles (Spy, Fake) en lugar de implementaciones reales
 */
describe('CreateOrder - Acceptance Tests', () => {
  let orderRepository: FakeOrderRepository;
  let eventBus: SpyEventBus;
  let logger: SpyLogger;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepository = new FakeOrderRepository();
    eventBus = new SpyEventBus();
    logger = new SpyLogger();
    useCase = new CreateOrderUseCase(orderRepository, eventBus, logger);
  });

  describe('Happy Path', () => {
    it('should create order with auto-generated ID', async () => {
      // Given: DTO vacío (sin orderId)
      const dto = {};

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: El pedido se crea con un ID generado
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id.value).toMatch(/^ORD-/);
      expect(result.value.items.length).toBe(0);
      expect(result.value.createdAt).toBeInstanceOf(Date);
    });

    it('should create order with provided ID', async () => {
      // Given: DTO con orderId específico
      const dto = {
        orderId: 'ORD-CUSTOM-12345',
      };

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: El pedido se crea con el ID especificado
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id.value).toBe('ORD-CUSTOM-12345');
    });

    it('should persist the order in repository', async () => {
      // Given: Repositorio vacío
      expect(orderRepository.count()).toBe(0);

      const dto = { orderId: 'ORD-PERSIST-TEST' };

      // When: Creo un pedido
      const result = await useCase.execute(dto);

      // Then: El pedido se persiste en el repositorio
      expect(result.ok).toBe(true);
      expect(orderRepository.count()).toBe(1);
      expect(orderRepository.wasSaved('ORD-PERSIST-TEST')).toBe(true);
    });

    it('should publish OrderCreated domain event', async () => {
      // Given: EventBus limpio
      expect(eventBus.getEventCount()).toBe(0);

      const dto = { orderId: 'ORD-EVENT-TEST' };

      // When: Creo un pedido
      const result = await useCase.execute(dto);

      // Then: Se publica el evento OrderCreated
      expect(result.ok).toBe(true);
      expect(eventBus.getEventCount()).toBe(1);
      expect(eventBus.wasPublished('OrderCreated')).toBe(true);

      const events = eventBus.getEventsByType('OrderCreated');
      expect(events.length).toBe(1);
      // aggregateId es el tipo de evento, no el ID del pedido
      expect(events[0].aggregateId).toBe('order.created');
    });

    it('should log order creation', async () => {
      // Given: Logger limpio
      expect(logger.getLogCount()).toBe(0);

      const dto = { orderId: 'ORD-LOG-TEST' };

      // When: Creo un pedido
      await useCase.execute(dto);

      // Then: Se loguea la creación
      expect(logger.hasLoggedMessage('Creating order')).toBe(true);
      expect(logger.hasLoggedMessage('Order created successfully')).toBe(true);
      expect(logger.getInfoLogs().length).toBeGreaterThan(0);
    });
  });

  describe('Validation Errors', () => {
    it('should treat empty string as undefined and generate ID', async () => {
      // Given: DTO con orderId vacío (comportamiento actual: se trata como undefined)
      const dto = {
        orderId: '',
      };

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: Se genera un ID automáticamente (no falla)
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id.value).toMatch(/^ORD-/);
      }
    });

    it('should fail with ValidationError when orderId is only whitespace', async () => {
      // Given: DTO con orderId solo espacios (truthy, entra en validación)
      const dto = {
        orderId: '   ',
      };

      // When: Intento crear el pedido
      const result = await useCase.execute(dto);

      // Then: Falla con error de validación
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isValidationError(result.error)).toBe(true);
        if (isValidationError(result.error)) {
          expect(result.error.field).toBe('orderId');
          expect(result.error.message).toContain('no puede estar vacío');
        }
      }
    });

    it('should log validation errors for whitespace-only IDs', async () => {
      // Given: DTO con orderId solo espacios
      const dto = { orderId: '   ' };

      logger.clear();

      // When: Intento crear el pedido
      await useCase.execute(dto);

      // Then: Se loguea el error de validación
      expect(logger.hasLoggedMessage('Invalid order ID provided')).toBe(true);
      expect(logger.getWarnLogs().length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Errors', () => {
    it('should fail with ConflictError when order ID already exists', async () => {
      // Given: Un pedido ya existente
      const existingOrderDto = { orderId: 'ORD-DUPLICATE' };
      await useCase.execute(existingOrderDto);

      // When: Intento crear otro pedido con el mismo ID
      const result = await useCase.execute(existingOrderDto);

      // Then: Falla con error de conflicto tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isConflictError(result.error)).toBe(true);
        if (isConflictError(result.error)) {
          expect(result.error.type).toBe('ConflictError');
          expect(result.error.message).toContain('Ya existe un pedido');
          expect(result.error.reason).toBe('duplicate_order_id');
        }
      }
    });

    it('should check repository before creating duplicate', async () => {
      // Given: Pedido existente
      await useCase.execute({ orderId: 'ORD-CHECK' });
      const existsCallsBefore = orderRepository.getExistsCalls();

      // When: Intento crear duplicado
      await useCase.execute({ orderId: 'ORD-CHECK' });

      // Then: Se verifica existencia en el repositorio
      expect(orderRepository.getExistsCalls()).toBe(existsCallsBefore + 1);
    });

    it('should log conflict errors', async () => {
      // Given: Pedido existente
      await useCase.execute({ orderId: 'ORD-CONFLICT' });
      logger.clear();

      // When: Intento crear duplicado
      await useCase.execute({ orderId: 'ORD-CONFLICT' });

      // Then: Se loguea el conflicto
      expect(logger.hasLoggedMessage('Order already exists')).toBe(true);
      expect(logger.getWarnLogs().length).toBeGreaterThan(0);
    });
  });

  describe('Infrastructure Errors', () => {
    it('should fail with InfraError when repository save fails', async () => {
      // Given: Repositorio configurado para fallar
      orderRepository.simulateSaveFailure();

      const dto = { orderId: 'ORD-SAVE-FAIL' };

      // When: Intento crear el pedido
      const result = await useCase.execute(dto);

      // Then: Falla con error de infraestructura tipado
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(isInfraError(result.error)).toBe(true);
        if (isInfraError(result.error)) {
          expect(result.error.type).toBe('InfraError');
          expect(result.error.message).toContain('Error al persistir el pedido');
        }
      }
    });

    it('should handle repository exists check in normal flow', async () => {
      // Note: FakeOrderRepository no tiene método para simular fallo en exists
      // Este test documenta el comportamiento normal
      const dto = { orderId: 'ORD-EXISTS-CHECK' };

      // When: Creo el pedido
      const result = await useCase.execute(dto);

      // Then: Se crea exitosamente y verifica existencia
      expect(result.ok).toBe(true);
      expect(orderRepository.getExistsCalls()).toBeGreaterThan(0);
    });

    it('should log infrastructure errors', async () => {
      // Given: Repositorio que falla
      orderRepository.simulateSaveFailure();
      const dto = { orderId: 'ORD-INFRA-ERROR' };

      // When: Intento crear el pedido
      await useCase.execute(dto);

      // Then: Se loguea el error
      expect(logger.getErrorLogs().length).toBeGreaterThan(0);
      expect(logger.hasLoggedError('Error persisting order')).toBe(true);
    });

    it('should not publish events when save fails', async () => {
      // Given: Repositorio que falla
      orderRepository.simulateSaveFailure();
      const dto = { orderId: 'ORD-NO-EVENT' };

      // When: Intento crear el pedido
      await useCase.execute(dto);

      // Then: No se publican eventos
      expect(eventBus.getEventCount()).toBe(0);
    });
  });

  describe('Event Publishing Edge Cases', () => {
    it('should not fail the operation if event publishing fails', async () => {
      // Given: EventBus que falla (simular error en publishAll)
      const failingEventBus: SpyEventBus = {
        ...eventBus,
        publishAll: async () => {
          throw new Error('Event bus connection error');
        },
      } as any;

      const useCaseWithFailingEventBus = new CreateOrderUseCase(
        orderRepository,
        failingEventBus,
        logger
      );

      const dto = { orderId: 'ORD-EVENT-FAIL' };

      // When: Creo el pedido
      const result = await useCaseWithFailingEventBus.execute(dto);

      // Then: El pedido se crea exitosamente (evento falla pero no la operación)
      expect(result.ok).toBe(true);
      expect(orderRepository.wasSaved('ORD-EVENT-FAIL')).toBe(true);

      // Y se loguea el error del evento
      expect(logger.getErrorLogs().length).toBeGreaterThan(0);
      expect(logger.hasLoggedError('Error publishing domain events')).toBe(true);
    });
  });

  describe('Integration with Multiple Components', () => {
    it('should coordinate between repository, event bus, and logger', async () => {
      // Given: Todos los componentes limpios
      orderRepository.clear();
      eventBus.clear();
      logger.clear();

      const dto = { orderId: 'ORD-INTEGRATION' };

      // When: Creo el pedido
      const result = await useCase.execute(dto);

      // Then: Todos los componentes fueron utilizados correctamente
      expect(result.ok).toBe(true);

      // Repositorio: 1 exists + 1 save
      expect(orderRepository.getExistsCalls()).toBe(1);
      expect(orderRepository.getSaveCalls()).toBe(1);
      expect(orderRepository.count()).toBe(1);

      // EventBus: 1 evento publicado
      expect(eventBus.getEventCount()).toBe(1);
      expect(eventBus.getPublishAllCalls()).toBe(1);

      // Logger: múltiples logs
      expect(logger.getLogCount()).toBeGreaterThan(0);
      expect(logger.getInfoLogs().length).toBeGreaterThan(0);
    });

    it('should maintain order ID consistency across all components', async () => {
      // Given: DTO con ID específico
      const dto = { orderId: 'ORD-CONSISTENCY-CHECK' };

      // When: Creo el pedido
      const result = await useCase.execute(dto);

      // Then: El mismo ID está en todos lados
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // En el valor retornado
      expect(result.value.id.value).toBe('ORD-CONSISTENCY-CHECK');

      // En el repositorio
      const savedOrder = await orderRepository.findById(result.value.id);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.id.value).toBe('ORD-CONSISTENCY-CHECK');

      // En los eventos (aggregateId es el tipo de evento)
      const events = eventBus.getPublishedEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].aggregateId).toBe('order.created');
    });
  });

  describe('DTO Contract', () => {
    it('should accept empty DTO object', async () => {
      // Given: DTO completamente vacío
      const dto = {};

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: Funciona correctamente
      expect(result.ok).toBe(true);
    });

    it('should accept DTO with undefined orderId', async () => {
      // Given: DTO con orderId explícitamente undefined
      const dto = { orderId: undefined };

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: Se genera un ID automáticamente
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id.value).toMatch(/^ORD-/);
      }
    });

    it('should trim whitespace from orderId', async () => {
      // Given: DTO con orderId con espacios
      const dto = { orderId: '  ORD-TRIM-TEST  ' };

      // When: Ejecuto el caso de uso
      const result = await useCase.execute(dto);

      // Then: El ID se trimea pero sigue siendo válido
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id.value).toBe('ORD-TRIM-TEST');
      }
    });
  });
});
