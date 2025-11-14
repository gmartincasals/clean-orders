import { Order } from '@domain/entities/Order.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Quantity } from '@domain/value-objects/Quantity.js';
import { Result, fail, ok } from '@shared/Results.js';
import { AddItemToOrderDTO } from '../dto/AddItemToOrderDTO.js';
import { AppError, infraError, notFoundError, validationError } from '../errors/AppError.js';
import { EventBus } from '../ports/EventBus.js';
import { OrderRepository } from '../ports/OrderRepository.js';
import { PricingService } from '../ports/PricingService.js';

/**
 * Caso de uso: Agregar un item a un pedido existente
 * Responsabilidades:
 * - Validar el DTO de entrada
 * - Recuperar el pedido del repositorio
 * - Obtener el precio actual del producto
 * - Agregar el item al pedido (o incrementar cantidad si ya existe)
 * - Persistir los cambios
 * - Publicar eventos de dominio
 */
export class AddItemToOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: PricingService,
    private readonly eventBus: EventBus
  ) {}

  async execute(dto: AddItemToOrderDTO): Promise<Result<Order, AppError>> {
    // Validar OrderId
    const orderIdResult = OrderId.create(dto.orderId);
    if (!orderIdResult.ok) {
      return fail(validationError(orderIdResult.error, 'orderId'));
    }
    const orderId = orderIdResult.value;

    // Validar ProductId
    const productIdResult = ProductId.create(dto.productId);
    if (!productIdResult.ok) {
      return fail(validationError(productIdResult.error, 'productId'));
    }
    const productId = productIdResult.value;

    // Validar Quantity
    const quantityResult = Quantity.create(dto.quantity);
    if (!quantityResult.ok) {
      return fail(validationError(quantityResult.error, 'quantity'));
    }
    const quantity = quantityResult.value;

    // Recuperar el pedido
    let order: Order;
    try {
      const foundOrder = await this.orderRepository.findById(orderId);
      if (!foundOrder) {
        return fail(notFoundError('Order', dto.orderId));
      }
      order = foundOrder;
    } catch (error) {
      return fail(infraError('Error al recuperar el pedido del repositorio', error));
    }

    // Obtener el precio actual del producto
    let price;
    try {
      price = await this.pricingService.getPrice(productId);
      if (!price) {
        return fail(
          notFoundError(
            'Product',
            dto.productId,
            `No se encontró el precio para el producto ${dto.productId}`
          )
        );
      }
    } catch (error) {
      return fail(infraError('Error al obtener el precio del producto', error));
    }

    // Agregar el item al pedido
    const addItemResult = order.addItem(productId, quantity, price);
    if (!addItemResult.ok) {
      return fail(validationError(addItemResult.error));
    }

    // Persistir los cambios
    try {
      await this.orderRepository.save(order);
    } catch (error) {
      return fail(infraError('Error al persistir los cambios del pedido', error));
    }

    // Publicar eventos de dominio
    try {
      const events = order.pullDomainEvents();
      await this.eventBus.publishAll(events);
    } catch (error) {
      // El pedido ya fue actualizado, registrar el error pero no fallar la operación
      // En un sistema real, aquí podrías implementar un retry o dead letter queue
      console.error('Error al publicar eventos de dominio:', error);
    }

    return ok(order);
  }
}
