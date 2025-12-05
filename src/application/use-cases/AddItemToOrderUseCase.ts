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
import { Logger } from '../ports/Logger.js';

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
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(dto: AddItemToOrderDTO): Promise<Result<Order, AppError>> {
    this.logger.info('Adding item to order', { orderId: dto.orderId, productId: dto.productId, quantity: dto.quantity });

    // Validar OrderId
    const orderIdResult = OrderId.create(dto.orderId);
    if (!orderIdResult.ok) {
      this.logger.warn('Invalid order ID', { orderId: dto.orderId, error: orderIdResult.error });
      return fail(validationError(orderIdResult.error, 'orderId'));
    }
    const orderId = orderIdResult.value;

    // Validar ProductId
    const productIdResult = ProductId.create(dto.productId);
    if (!productIdResult.ok) {
      this.logger.warn('Invalid product ID', { productId: dto.productId, error: productIdResult.error });
      return fail(validationError(productIdResult.error, 'productId'));
    }
    const productId = productIdResult.value;

    // Validar Quantity
    const quantityResult = Quantity.create(dto.quantity);
    if (!quantityResult.ok) {
      this.logger.warn('Invalid quantity', { quantity: dto.quantity, error: quantityResult.error });
      return fail(validationError(quantityResult.error, 'quantity'));
    }
    const quantity = quantityResult.value;

    // Recuperar el pedido
    let order: Order;
    try {
      const foundOrder = await this.orderRepository.findById(orderId);
      if (!foundOrder) {
        this.logger.warn('Order not found', { orderId: dto.orderId });
        return fail(notFoundError('Order', dto.orderId));
      }
      order = foundOrder;
      this.logger.debug('Order retrieved', { orderId: dto.orderId });
    } catch (error) {
      this.logger.error('Error retrieving order', { orderId: dto.orderId, error });
      return fail(infraError('Error al recuperar el pedido del repositorio', error));
    }

    // Obtener el precio actual del producto
    let price;
    try {
      price = await this.pricingService.getPrice(productId);
      if (!price) {
        this.logger.warn('Product price not found', { productId: dto.productId });
        return fail(
          notFoundError(
            'Product',
            dto.productId,
            `No se encontró el precio para el producto ${dto.productId}`
          )
        );
      }
      this.logger.debug('Product price retrieved', { productId: dto.productId, price: price.amount });
    } catch (error) {
      this.logger.error('Error retrieving product price', { productId: dto.productId, error });
      return fail(infraError('Error al obtener el precio del producto', error));
    }

    // Agregar el item al pedido
    const addItemResult = order.addItem(productId, quantity, price);
    if (!addItemResult.ok) {
      this.logger.warn('Failed to add item to order', { orderId: dto.orderId, productId: dto.productId, error: addItemResult.error });
      return fail(validationError(addItemResult.error));
    }
    this.logger.debug('Item added to order', { orderId: dto.orderId, productId: dto.productId });

    // Persistir los cambios
    try {
      await this.orderRepository.save(order);
      this.logger.info('Order updated successfully', { orderId: dto.orderId, productId: dto.productId });
    } catch (error) {
      this.logger.error('Error persisting order changes', { orderId: dto.orderId, error });
      return fail(infraError('Error al persistir los cambios del pedido', error));
    }

    // Publicar eventos de dominio
    try {
      const events = order.pullDomainEvents();
      await this.eventBus.publishAll(events);
      this.logger.debug('Domain events published', { orderId: dto.orderId, eventCount: events.length });
    } catch (error) {
      // El pedido ya fue actualizado, registrar el error pero no fallar la operación
      // En un sistema real, aquí podrías implementar un retry o dead letter queue
      this.logger.error('Error publishing domain events', { orderId: dto.orderId, error });
    }

    this.logger.info('Item added to order successfully', { orderId: dto.orderId, productId: dto.productId });
    return ok(order);
  }
}
