import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { Result, fail, ok } from '@shared/Results.js';
import { CreateOrderDTO } from '../dto/CreateOrderDTO.js';
import { AppError, conflictError, infraError } from '../errors/AppError.js';
import { EventBus } from '../ports/EventBus.js';
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
    private readonly eventBus: EventBus
  ) {}

  async execute(dto: CreateOrderDTO): Promise<Result<Order, AppError>> {
    // Si se provee un ID, validarlo y verificar que no exista
    let orderId: OrderId;

    if (dto.orderId) {
      const orderIdResult = OrderId.create(dto.orderId);
      if (!orderIdResult.ok) {
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
          return fail(
            conflictError(`Ya existe un pedido con ID ${dto.orderId}`, 'duplicate_order_id')
          );
        }
      } catch (error) {
        return fail(infraError('Error al verificar la existencia del pedido', error));
      }
    } else {
      // Generar un nuevo ID
      orderId = OrderId.generate();
    }

    // Crear el agregado Order
    const order = Order.create(orderId);

    // Persistir el pedido
    try {
      await this.orderRepository.save(order);
    } catch (error) {
      return fail(infraError('Error al persistir el pedido en el repositorio', error));
    }

    // Publicar eventos de dominio
    try {
      const events = order.pullDomainEvents();
      await this.eventBus.publishAll(events);
    } catch (error) {
      // El pedido ya fue guardado, registrar el error pero no fallar la operación
      // En un sistema real, aquí podrías implementar un retry o dead letter queue
      console.error('Error al publicar eventos de dominio:', error);
    }

    return ok(order);
  }
}
