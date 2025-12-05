import { OrderRepository } from '@application/ports/OrderRepository.js';
import { Order } from '@domain/entities/Order.js';
import { Currency } from '@domain/value-objects/Currency.js';
import { Money } from '@domain/value-objects/Money.js';
import { OrderId } from '@domain/value-objects/OrderId.js';
import { OrderItem } from '@domain/value-objects/OrderItem.js';
import { ProductId } from '@domain/value-objects/ProductId.js';
import { Quantity } from '@domain/value-objects/Quantity.js';
import pg from 'pg';

const { Pool } = pg;

interface OrderRow {
  id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  created_at: Date;
}

export class PostgresOrderRepository implements OrderRepository {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async save(order: Order): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Calcular el total del pedido
      const totalResult = order.calculateTotal();
      const totalAmount = totalResult.ok ? totalResult.value.amount : 0;
      const currency = order.items.length > 0 ? order.items[0].unitPrice.currency.code : 'USD';

      // UPSERT del pedido
      await client.query(
        `
        INSERT INTO orders (id, customer_id, status, total_amount, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) 
        DO UPDATE SET
          total_amount = EXCLUDED.total_amount,
          currency = EXCLUDED.currency,
          updated_at = EXCLUDED.updated_at
        `,
        [
          order.id.value,
          '00000000-0000-0000-0000-000000000000', // customer_id dummy por ahora
          'pending', // status dummy por ahora
          totalAmount,
          currency,
          order.createdAt,
          new Date(),
        ]
      );

      // DELETE de todos los items existentes
      await client.query('DELETE FROM order_items WHERE order_id = $1', [order.id.value]);

      // INSERT de todos los items actuales
      for (const item of order.items) {
        const subtotalResult = item.calculateSubtotal();
        const subtotal = subtotalResult.ok ? subtotalResult.value.amount : 0;

        await client.query(
          `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, currency)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            order.id.value,
            item.productId.value,
            item.quantity.value,
            item.unitPrice.amount,
            subtotal,
            item.unitPrice.currency.code,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: OrderId): Promise<Order | undefined> {
    const client = await this.pool.connect();

    try {
      // Buscar el pedido
      const orderResult = await client.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [
        id.value,
      ]);

      if (orderResult.rows.length === 0) {
        return undefined;
      }

      // Buscar los items del pedido
      const itemsResult = await client.query<OrderItemRow>(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
        [id.value]
      );

      // Reconstituir los items
      const items: OrderItem[] = [];
      for (const row of itemsResult.rows) {
        const productId = ProductId.create(row.product_id);
        if (!productId.ok) continue;

        const quantity = Quantity.create(row.quantity);
        if (!quantity.ok) continue;

        const currency = Currency.create(row.currency);
        if (!currency.ok) continue;

        const unitPrice = Money.create(row.unit_price, currency.value);
        if (!unitPrice.ok) continue;

        const itemResult = OrderItem.create(productId.value, quantity.value, unitPrice.value);

        if (itemResult.ok) {
          items.push(itemResult.value);
        }
      }

      // Reconstituir el pedido
      return Order.reconstitute(id, items);
    } finally {
      client.release();
    }
  }

  async exists(id: OrderId): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const result = await client.query('SELECT 1 FROM orders WHERE id = $1', [id.value]);

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
