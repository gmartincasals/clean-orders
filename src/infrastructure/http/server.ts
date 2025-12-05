import { ServerDependencies } from '@application/ports/ServerDependencies.js';
import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase.js';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase.js';
import Fastify, { FastifyInstance } from 'fastify';
import { OrdersController } from './controllers/OrdersController.js';

/**
 * Opciones de configuración del servidor
 */
export interface ServerConfig {
  host?: string;
  port?: number;
  logger?: boolean;
}

/**
 * Clase que encapsula el servidor HTTP con Fastify
 */
export class Server {
  private readonly fastify: FastifyInstance;
  private readonly config: Required<ServerConfig>;

  constructor(dependencies: ServerDependencies, config?: ServerConfig) {
    // Configuración por defecto
    this.config = {
      host: config?.host ?? '0.0.0.0',
      port: config?.port ?? 3000,
      logger: config?.logger ?? true,
    };

    // Crear instancia de Fastify
    this.fastify = Fastify({
      logger: this.config.logger,
      disableRequestLogging: false,
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'reqId',
    });

    // Configurar el servidor
    this.setupMiddleware();
    this.setupRoutes(dependencies);
    this.setupErrorHandlers();
  }

  /**
   * Configura middlewares globales
   */
  private setupMiddleware(): void {
    // CORS
    this.fastify.addHook('onRequest', async (_request, reply) => {
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    });

    // Root endpoint
    this.fastify.get('/', async () => {
      return {
        name: 'Clean Orders API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          orders: {
            create: 'POST /orders',
            addItem: 'POST /orders/:id/items',
            get: 'GET /orders/:id (Not Implemented)',
          },
        },
      };
    });
  }

  /**
   * Configura las rutas de la aplicación
   */
  private setupRoutes(dependencies: ServerDependencies): void {
    // Instanciar casos de uso
    const createOrderUseCase = new CreateOrderUseCase(
      dependencies.orderRepository,
      dependencies.eventBus,
      dependencies.logger
    );

    const addItemToOrderUseCase = new AddItemToOrderUseCase(
      dependencies.orderRepository,
      dependencies.pricingService,
      dependencies.eventBus,
      dependencies.logger
    );

    // Instanciar y registrar controlador
    const ordersController = new OrdersController(
      createOrderUseCase,
      addItemToOrderUseCase,
      dependencies.logger
    );
    ordersController.registerRoutes(this.fastify);

    this.fastify.log.info('Routes registered successfully');
  }

  /**
   * Configura manejadores de errores globales
   */
  private setupErrorHandlers(): void {
    // Manejo de errores no capturados
    this.fastify.setErrorHandler((error, _request, reply) => {
      this.fastify.log.error(error);

      // Error de validación de Fastify
      if (error && typeof error === 'object' && 'validation' in error) {
        reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: (error as any).validation,
        });
        return;
      }

      // Error genérico
      const statusCode = (error as any)?.statusCode || 500;
      const name = (error as any)?.name || 'Internal Server Error';
      const message = (error as any)?.message || 'An unexpected error occurred';

      reply.status(statusCode).send({
        error: name,
        message: message,
      });
    });

    // Manejo de rutas no encontradas
    this.fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
      });
    });
  }

  /**
   * Inicia el servidor
   */
  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        host: this.config.host,
        port: this.config.port,
      });

      this.fastify.log.info(`Server listening on http://${this.config.host}:${this.config.port}`);
      this.fastify.log.info('Press CTRL+C to stop');
    } catch (error) {
      this.fastify.log.error(error);
      throw error;
    }
  }

  /**
   * Detiene el servidor gracefully
   */
  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      this.fastify.log.info('Server stopped gracefully');
    } catch (error) {
      this.fastify.log.error(error, 'Error stopping server');
      throw error;
    }
  }

  /**
   * Obtiene la instancia de Fastify (útil para testing)
   */
  getInstance(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Obtiene la configuración del servidor
   */
  getConfig(): Required<ServerConfig> {
    return { ...this.config };
  }
}
