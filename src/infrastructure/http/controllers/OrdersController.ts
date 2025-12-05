import { AddItemToOrderDTO } from '@application/dto/AddItemToOrderDTO.js';
import { CreateOrderDTO } from '@application/dto/CreateOrderDTO.js';
import { AppError } from '@application/errors/AppError.js';
import { Logger } from '@application/ports/Logger.js';
import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase.js';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Interfaces para las rutas del controlador
 */
interface CreateOrderRequest {
  Body: { orderId?: string };
}

interface AddItemToOrderRequest {
  Params: { id: string };
  Body: { productId: string; quantity: number };
}

interface GetOrderRequest {
  Params: { id: string };
}

/**
 * Interfaces para las respuestas
 */

/**
 * Controlador de pedidos para Fastify
 * Maneja las rutas HTTP relacionadas con pedidos
 */
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly addItemToOrderUseCase: AddItemToOrderUseCase,
    private readonly logger: Logger
  ) {}

  /**
   * Registra todas las rutas del controlador
   */
  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    // POST /orders - Crear un nuevo pedido
    fastify.post<CreateOrderRequest>('/orders', async (request, reply) => {
      return this.createOrder(request, reply);
    });

    // POST /orders/:id/items - Agregar item a un pedido
    fastify.post<AddItemToOrderRequest>('/orders/:id/items', async (request, reply) => {
      return this.addItemToOrder(request, reply);
    });

    // GET /orders/:id - Obtener un pedido (opcional, para verificación)
    fastify.get<GetOrderRequest>('/orders/:id', async (_request, reply) => {
      reply.status(501).send({
        error: 'Not Implemented',
        message: 'Endpoint no implementado. Use POST /orders y POST /orders/:id/items',
      });
    });
  }

  /**
   * POST /orders
   * Crea un nuevo pedido
   */
  private async createOrder(
    request: FastifyRequest<CreateOrderRequest>,
    reply: FastifyReply
  ): Promise<void> {
    const requestLogger = this.logger.child({ requestId: request.id });
    requestLogger.info('POST /orders - Creating order', { body: request.body });

    const dto: CreateOrderDTO = {
      orderId: request.body.orderId,
    };

    const result = await this.createOrderUseCase.execute(dto);

    if (!result.ok) {
      requestLogger.warn('Failed to create order', { error: result.error });
      this.handleError(result.error, reply);
      return;
    }

    const order = result.value;

    // Calcular total del pedido
    const totalResult = order.calculateTotal();
    const total = totalResult.ok
      ? { amount: totalResult.value.amount, currency: totalResult.value.currency.code }
      : { amount: 0, currency: 'USD' };

    const response = {
      orderId: order.id.value,
      items: order.items.map((item) => {
        const subtotalResult = item.calculateSubtotal();
        return {
          productId: item.productId.value,
          quantity: item.quantity.value,
          unitPrice: {
            amount: item.unitPrice.amount,
            currency: item.unitPrice.currency.code,
          },
          subtotal: subtotalResult.ok
            ? {
                amount: subtotalResult.value.amount,
                currency: subtotalResult.value.currency.code,
              }
            : { amount: 0, currency: item.unitPrice.currency.code },
        };
      }),
      total,
      createdAt: order.createdAt,
    };

    requestLogger.info('Order created successfully', { orderId: order.id.value });
    reply.status(201).send(response);
  }

  /**
   * POST /orders/:id/items
   * Agrega un item a un pedido existente
   */
  private async addItemToOrder(
    request: FastifyRequest<AddItemToOrderRequest>,
    reply: FastifyReply
  ): Promise<void> {
    const requestLogger = this.logger.child({ requestId: request.id });
    requestLogger.info('POST /orders/:id/items - Adding item to order', { 
      orderId: request.params.id,
      body: request.body 
    });

    const dto: AddItemToOrderDTO = {
      orderId: request.params.id,
      productId: request.body.productId,
      quantity: request.body.quantity,
    };

    const result = await this.addItemToOrderUseCase.execute(dto);

    if (!result.ok) {
      requestLogger.warn('Failed to add item to order', { error: result.error });
      this.handleError(result.error, reply);
      return;
    }

    const order = result.value;

    // Calcular total del pedido
    const totalResult = order.calculateTotal();
    const total = totalResult.ok
      ? { amount: totalResult.value.amount, currency: totalResult.value.currency.code }
      : { amount: 0, currency: 'USD' };

    const response = {
      orderId: order.id.value,
      items: order.items.map((item) => {
        const subtotalResult = item.calculateSubtotal();
        return {
          productId: item.productId.value,
          quantity: item.quantity.value,
          unitPrice: {
            amount: item.unitPrice.amount,
            currency: item.unitPrice.currency.code,
          },
          subtotal: subtotalResult.ok
            ? {
                amount: subtotalResult.value.amount,
                currency: subtotalResult.value.currency.code,
              }
            : { amount: 0, currency: item.unitPrice.currency.code },
        };
      }),
      total,
      createdAt: order.createdAt,
    };

    requestLogger.info('Item added to order successfully', { orderId: order.id.value });
    reply.status(200).send(response);
  }

  /**
   * Maneja los errores de aplicación y los convierte en respuestas HTTP
   */
  private handleError(error: AppError, reply: FastifyReply): void {
    switch (error.type) {
      case 'ValidationError':
        reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          field: error.field,
        });
        break;

      case 'NotFoundError':
        reply.status(404).send({
          error: 'Not Found',
          message: error.message,
          resource: error.resource,
          id: error.id,
        });
        break;

      case 'ConflictError':
        reply.status(409).send({
          error: 'Conflict',
          message: error.message,
          reason: error.reason,
        });
        break;

      case 'InfraError':
        reply.status(500).send({
          error: 'Internal Server Error',
          message: error.message,
        });
        break;

      default:
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
    }
  }
}
