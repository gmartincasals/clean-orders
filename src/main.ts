import { closeContainer, createDependencies } from './composition/container.js';
import { Server } from './infrastructure/http/server.js';

/**
 * Clase que gestiona el ciclo de vida de la aplicación
 */
class Application {
  private server: Server | null = null;
  private isRunning = false;

  /**
   * Inicia la aplicación
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Application is already running');
      return;
    }

    try {
      console.log('Starting Clean Orders API...');

      // Crear las dependencias usando el contenedor
      const dependencies = createDependencies();

      // Log inicial
      dependencies.logger.info('Starting application', {
        environment: process.env.NODE_ENV ?? 'development',
        useInMemory: process.env.USE_INMEMORY === 'true',
      });

      // Configurar el servidor
      const serverConfig = {
        host: process.env.HOST ?? '0.0.0.0',
        port: parseInt(process.env.PORT ?? '3000', 10),
        logger: process.env.NODE_ENV !== 'test',
      };

      // Crear e iniciar el servidor
      this.server = new Server(dependencies, serverConfig);
      await this.server.start();

      this.isRunning = true;

      console.log('✓ Clean Orders API started successfully');
      console.log(`✓ Server running on http://${serverConfig.host}:${serverConfig.port}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV ?? 'development'}`);
      console.log(`✓ Storage: ${process.env.USE_INMEMORY === 'true' ? 'InMemory' : 'PostgreSQL'}`);
      console.log('\nAvailable endpoints:');
      console.log('  GET  /health');
      console.log('  POST /orders');
      console.log('  POST /orders/:id/items');

      dependencies.logger.info('Application started successfully');
    } catch (error) {
      console.error('Failed to start application:', error);
      throw error;
    }
  }

  /**
   * Detiene la aplicación gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Application is not running');
      return;
    }

    try {
      console.log('\nStopping Clean Orders API...');

      // Detener el servidor HTTP
      if (this.server) {
        await this.server.stop();
        this.server = null;
      }

      // Cerrar el contenedor (cierra database, messaging, etc.)
      await closeContainer();

      this.isRunning = false;
      console.log('✓ Application stopped successfully');
    } catch (error) {
      console.error('Error stopping application:', error);
      throw error;
    }
  }

  /**
   * Reinicia la aplicación
   */
  async restart(): Promise<void> {
    console.log('Restarting application...');
    await this.stop();
    await this.start();
  }

  /**
   * Verifica si la aplicación está ejecutándose
   */
  isApplicationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Obtiene la instancia del servidor (útil para testing)
   */
  getServer(): Server | null {
    return this.server;
  }
}

/**
 * Instancia global de la aplicación
 */
const app = new Application();

/**
 * Punto de entrada principal
 */
async function main(): Promise<void> {
  try {
    // Configurar manejadores de señales para shutdown graceful
    setupGracefulShutdown(app);

    // Iniciar la aplicación
    await app.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Configura el manejo de señales para shutdown graceful
 */
function setupGracefulShutdown(application: Application): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      try {
        await application.stop();
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });

  // Manejar errores no capturados
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    try {
      await application.stop();
    } catch (stopError) {
      console.error('Error stopping application after uncaught exception:', stopError);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    try {
      await application.stop();
    } catch (stopError) {
      console.error('Error stopping application after unhandled rejection:', stopError);
    }
    process.exit(1);
  });
}

// Ejecutar la aplicación
main();

// Exportar la instancia de la aplicación para testing
export { app, Application };
