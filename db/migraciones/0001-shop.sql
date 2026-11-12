-- Migración para la tienda 2 (se ejecuta UNA sola vez sobre la base de datos real, ANTES de subir el código):
--   npx wrangler d1 execute jgr-db --remote --file=./db/migraciones/0001-shop.sql
-- No borra ni cambia productos, precios ni pedidos de JGR: solo agrega una tabla y una columna.
-- Si la vuelves a ejecutar, falla en la línea ALTER TABLE con "duplicate column name: store"; eso significa que ya estaba aplicada.

CREATE TABLE IF NOT EXISTS store_prices (
  store TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  compare_at_price INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store, product_id)
);

ALTER TABLE orders ADD COLUMN store TEXT NOT NULL DEFAULT 'jgr';
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store, id);
