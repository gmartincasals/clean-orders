-- Actualizar esquema para coincidir con PostgresOrderRepository

-- Eliminar constraint de foreign key
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_order;

-- Modificar tabla orders para agregar currency
ALTER TABLE orders
  ALTER COLUMN id TYPE VARCHAR(255),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Modificar tabla order_items
ALTER TABLE order_items
  ALTER COLUMN order_id TYPE VARCHAR(255),
  ALTER COLUMN product_id TYPE VARCHAR(255),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Recrear foreign key con tipos correctos
ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE;

-- Actualizar índices
DROP INDEX IF EXISTS idx_order_items_order_id;
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

DROP INDEX IF EXISTS idx_order_items_product_id;
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Modificar tabla outbox para usar VARCHAR en lugar de UUID
ALTER TABLE outbox
  ALTER COLUMN aggregate_id TYPE VARCHAR(255);

-- Actualizar índice del outbox
DROP INDEX IF EXISTS idx_outbox_aggregate;
CREATE INDEX idx_outbox_aggregate ON outbox(aggregate_type, aggregate_id);
