import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { Result, fail, ok } from '@shared/Results.js';
import { CreateOrderDTO } from '../dto/CreateOrderDTO.js';
import { AppError, conflictError, infraError } from '../errors/AppError.js';
import { EventBus } from '../ports/EventBus.js';
import { Logger } from '../ports/Logger.js';
import { OrderRepository } from '../ports/OrderRepository.js';

/**
 * Caso de uso: Crear un nuevo pedido
 * Responsabilidades:
 * - Validar el DTO de entrada
 * - Crear el agregado Order
 * - Persistir el pedido
 * - Publicar eventos de dominio
 */
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(dto: CreateOrderDTO): Promise<Result<Order, AppError>> {
    this.logger.info('Creating order', { orderId: dto.orderId });

    // Si se provee un ID, validarlo y verificar que no exista
    let orderId: OrderId;

    if (dto.orderId) {
      const orderIdResult = OrderId.create(dto.orderId);
      if (!orderIdResult.ok) {
        this.logger.warn('Invalid order ID provided', { orderId: dto.orderId, error: orderIdResult.error });
        return fail({
          type: 'ValidationError',
          message: orderIdResult.error,
          field: 'orderId',
        });
      }
      orderId = orderIdResult.value;

      // Verificar que no exista un pedido con ese ID
      try {
        const exists = await this.orderRepository.exists(orderId);
        if (exists) {
          this.logger.warn('Order already exists', { orderId: dto.orderId });
          return fail(
            conflictError(`Ya existe un pedido con ID ${dto.orderId}`, 'duplicate_order_id')
          );
        }
      } catch (error) {
        this.logger.error('Error checking order existence', { orderId: dto.orderId, error });
        return fail(infraError('Error al verificar la existencia del pedido', error));
      }
    } else {
      // Generar un nuevo ID
      orderId = OrderId.generate();
      this.logger.debug('Generated new order ID', { orderId: orderId.value });
    }

    // Crear el agregado Order
    const order = Order.create(orderId);
    this.logger.debug('Order aggregate created', { orderId: order.id.value });

    // Persistir el pedido
    try {
      await this.orderRepository.save(order);
      this.logger.info('Order persisted successfully', { orderId: order.id.value });
    } catch (error) {
      this.logger.error('Error persisting order', { orderId: order.id.value, error });
      return fail(infraError('Error al persistir el pedido en el repositorio', error));
    }

    // Publicar eventos de dominio
    try {
      const events = order.pullDomainEvents();
      await this.eventBus.publishAll(events);
      this.logger.debug('Domain events published', { orderId: order.id.value, eventCount: events.length });
    } catch (error) {
      // El pedido ya fue guardado, registrar el error pero no fallar la operación
      // En un sistema real, aquí podrías implementar un retry o dead letter queue
      this.logger.error('Error publishing domain events', { orderId: order.id.value, error });
    }

    this.logger.info('Order created successfully', { orderId: order.id.value });
    return ok(order);
  }
}
