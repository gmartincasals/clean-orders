import pg from 'pg';
import { config } from '@composition/config.js';

const { Pool } = pg;

/**
 * Helper para gestionar la base de datos de tests E2E
 */
export class TestDatabase {
  private pool: pg.Pool;

  constructor(connectionString: string = config.DATABASE_URL) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * Limpia todas las tablas para test aislado
   */
  async clean(): Promise<void> {
    await this.pool.query('TRUNCATE TABLE outbox CASCADE');
    await this.pool.query('TRUNCATE TABLE orders CASCADE');
  }

  /**
   * Ejecuta una query SQL
   */
  async query<T extends pg.QueryResultRow = any>(sql: string, params?: any[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  /**
   * Obtiene un pedido de la base de datos con sus items
   */
  async getOrder(orderId: string): Promise<any | null> {
    const orderResult = await this.pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Obtener items del pedido
    const itemsResult = await this.pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
      [orderId]
    );

    // Agregar items al objeto del pedido
    order.items = itemsResult.rows.map((row: any) => ({
      product_id: row.product_id,
      quantity: row.quantity,
      unit_price: {
        amount: parseFloat(row.unit_price),
        currency: row.currency,
      },
      total_price: parseFloat(row.total_price),
    }));

    return order;
  }

  /**
   * Obtiene eventos de la outbox
   */
  async getOutboxEvents(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM outbox ORDER BY created_at ASC'
    );
    return result.rows;
  }

  /**
   * Obtiene eventos de la outbox sin publicar
   */
  async getUnpublishedEvents(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at ASC'
    );
    return result.rows;
  }

  /**
   * Cuenta los pedidos en la base de datos
   */
  async countOrders(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM orders'
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Cierra la conexión
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
