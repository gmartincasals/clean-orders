import { Logger } from '@application/ports/Logger.js';
import pg from 'pg';

const { Pool } = pg;

/**
 * Configuración del pool de conexiones de PostgreSQL
 */
export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  logger?: Logger;
}

/**
 * Factory para crear y gestionar pools de conexiones a PostgreSQL
 * Implementa el patrón Singleton para reutilizar el pool de conexiones
 */
export class DatabaseFactory {
  private static instance: DatabaseFactory | null = null;
  private pool: pg.Pool | null = null;
  private config: DatabaseConfig;
  private logger: Logger;
  private isShuttingDown = false;

  private constructor(config: DatabaseConfig) {
    this.config = {
      max: 20, // Máximo de conexiones en el pool
      idleTimeoutMillis: 30000, // 30 segundos
      connectionTimeoutMillis: 5000, // 5 segundos
      ...config,
    };
    
    if (!config.logger) {
      throw new Error('Logger is required for DatabaseFactory');
    }
    this.logger = config.logger;
  }

  /**
   * Obtiene la instancia singleton del DatabaseFactory
   */
  static getInstance(config: DatabaseConfig): DatabaseFactory {
    if (!DatabaseFactory.instance) {
      DatabaseFactory.instance = new DatabaseFactory(config);
    }
    return DatabaseFactory.instance;
  }

  /**
   * Crea y configura el pool de conexiones
   */
  createPool(): pg.Pool {
    if (this.pool && !this.isShuttingDown) {
      return this.pool;
    }

    this.logger.info('Creating PostgreSQL connection pool');

    this.pool = new Pool({
      connectionString: this.config.connectionString,
      max: this.config.max,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
    });

    this.setupPoolEventHandlers();

    return this.pool;
  }

  /**
   * Obtiene el pool de conexiones (lo crea si no existe)
   */
  getPool(): pg.Pool {
    if (!this.pool) {
      return this.createPool();
    }
    return this.pool;
  }

  /**
   * Obtiene una conexión del pool
   */
  async getClient(): Promise<pg.PoolClient> {
    const pool = this.getPool();
    return pool.connect();
  }

  /**
   * Ejecuta una query directamente en el pool
   */
  async query<T extends pg.QueryResultRow = any>(
    sql: string,
    params?: any[]
  ): Promise<pg.QueryResult<T>> {
    const pool = this.getPool();
    return pool.query<T>(sql, params);
  }

  /**
   * Ejecuta una función dentro de una transacción
   */
  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica la conectividad con la base de datos
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      this.logger.error('Database health check failed', { error });
      return false;
    }
  }

  /**
   * Obtiene estadísticas del pool de conexiones
   */
  getPoolStats() {
    if (!this.pool) {
      return {
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
      };
    }

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }

  /**
   * Configura los event handlers del pool para logging y debugging
   */
  private setupPoolEventHandlers(): void {
    if (!this.pool) return;

    // Cuando se establece una nueva conexión
    this.pool.on('connect', () => {
      this.logger.debug('New client connected to database');
    });

    // Cuando un cliente es adquirido del pool
    this.pool.on('acquire', () => {
      this.logger.trace('Client acquired from pool');
    });

    // Cuando un cliente es liberado al pool
    this.pool.on('remove', () => {
      this.logger.debug('Client removed from pool');
    });

    // Cuando ocurre un error en el pool
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle database client', { error: err });
    });
  }

  /**
   * Cierra el pool de conexiones de forma graceful
   */
  async close(): Promise<void> {
    if (!this.pool || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Closing database connection pool');

    try {
      await this.pool.end();
      this.pool = null;
      DatabaseFactory.instance = null;
      this.logger.info('Database connection pool closed successfully');
    } catch (error) {
      this.logger.error('Error closing database pool', { error });
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Resetea la instancia singleton (útil para testing)
   */
  static reset(): void {
    DatabaseFactory.instance = null;
  }
}

/**
 * Helper function para crear un DatabaseFactory con configuración simplificada
 */
export function createDatabaseFactory(connectionString: string, logger: Logger): DatabaseFactory {
  return DatabaseFactory.getInstance({ connectionString, logger });
}
