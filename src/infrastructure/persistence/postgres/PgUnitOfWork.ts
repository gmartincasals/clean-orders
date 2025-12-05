import pg from 'pg';

const { Pool } = pg;

/**
 * Unit of Work para PostgreSQL
 * Implementa el patrón Unit of Work para coordinar transacciones
 * y gestionar el ciclo de vida de las conexiones a la base de datos
 */
export class PgUnitOfWork {
  private client: pg.PoolClient | null = null;
  private isInTransaction = false;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * Inicia una nueva transacción
   * Obtiene una conexión del pool y ejecuta BEGIN
   */
  async begin(): Promise<void> {
    if (this.isInTransaction) {
      throw new Error('Ya existe una transacción activa');
    }

    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
    this.isInTransaction = true;
  }

  /**
   * Confirma la transacción actual
   * Ejecuta COMMIT y libera la conexión
   */
  async commit(): Promise<void> {
    if (!this.isInTransaction || !this.client) {
      throw new Error('No hay transacción activa para confirmar');
    }

    try {
      await this.client.query('COMMIT');
    } finally {
      this.release();
    }
  }

  /**
   * Revierte la transacción actual
   * Ejecuta ROLLBACK y libera la conexión
   */
  async rollback(): Promise<void> {
    if (!this.isInTransaction || !this.client) {
      throw new Error('No hay transacción activa para revertir');
    }

    try {
      await this.client.query('ROLLBACK');
    } finally {
      this.release();
    }
  }

  /**
   * Ejecuta una query dentro de la transacción activa
   */
  async query<T extends pg.QueryResultRow = any>(
    sql: string,
    params?: any[]
  ): Promise<pg.QueryResult<T>> {
    if (!this.client) {
      throw new Error('No hay conexión activa. Llama a begin() primero');
    }

    return this.client.query<T>(sql, params);
  }

  /**
   * Ejecuta una función dentro de una transacción
   * Si la función tiene éxito, hace commit automáticamente
   * Si falla, hace rollback automáticamente
   */
  async executeInTransaction<T>(fn: (uow: PgUnitOfWork) => Promise<T>): Promise<T> {
    await this.begin();

    try {
      const result = await fn(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Obtiene el cliente de PostgreSQL actual
   * Útil para operaciones complejas que necesiten acceso directo
   */
  getClient(): pg.PoolClient {
    if (!this.client) {
      throw new Error('No hay conexión activa');
    }
    return this.client;
  }

  /**
   * Verifica si hay una transacción activa
   */
  isActive(): boolean {
    return this.isInTransaction;
  }

  /**
   * Libera la conexión al pool
   * @private
   */
  private release(): void {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    this.isInTransaction = false;
  }

  /**
   * Cierra el pool de conexiones
   * Debe llamarse al cerrar la aplicación
   */
  async close(): Promise<void> {
    if (this.isInTransaction) {
      await this.rollback();
    }
    await this.pool.end();
  }

  /**
   * Obtiene estadísticas del pool de conexiones
   */
  getPoolStats() {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }

  /**
   * Ejecuta una query de salud para verificar la conexión
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch {
      return false;
    }
  }
}
