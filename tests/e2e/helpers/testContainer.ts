import { Container } from '@composition/container.js';
import { ServerDependencies } from '@application/ports/ServerDependencies.js';

/**
 * Helper para gestionar el contenedor en tests E2E
 * Usa la infraestructura real (PostgreSQL)
 */
export class TestContainer {
  private container: Container | null = null;

  /**
   * Inicializa el contenedor
   * IMPORTANTE: Asume que USE_INMEMORY=false en el .env de test
   */
  async initialize(): Promise<void> {
    // Reset cualquier instancia previa
    Container.reset();

    // Obtener nueva instancia (con infraestructura real)
    this.container = Container.getInstance();
  }

  /**
   * Obtiene las dependencias del contenedor
   */
  getDependencies(): ServerDependencies {
    if (!this.container) {
      throw new Error('Container not initialized. Call initialize() first.');
    }
    return this.container.getDependencies();
  }

  /**
   * Cierra el contenedor y libera recursos
   */
  async close(): Promise<void> {
    if (this.container) {
      await this.container.close();
      Container.reset();
      this.container = null;
    }
  }
}
