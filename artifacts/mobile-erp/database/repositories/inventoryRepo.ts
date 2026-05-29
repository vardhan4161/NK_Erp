/**
 * Inventory repository — Stock movements, adjustments, purchase entries
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference: string | null;
  notes: string | null;
  created_by_id: number | null;
  created_by_name?: string;
  created_at: string;
}

export function createInventoryRepo(db: SQLiteDB) {
  return {
    /** Add stock (purchase entry) */
    async addStock(productId: number, quantity: number, notes?: string, userId?: number): Promise<void> {
      const product = await db.getFirstAsync<{ current_stock: number }>('SELECT current_stock FROM products WHERE id = ?', [productId]);
      if (!product) throw new Error('Product not found');

      const prevStock = product.current_stock;
      const newStock = prevStock + quantity;

      await db.execAsync('BEGIN TRANSACTION');
      try {
        await db.runAsync("UPDATE products SET current_stock = ?, updated_at = datetime('now') WHERE id = ?", [newStock, productId]);
        await db.runAsync(
          'INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [productId, 'PURCHASE', quantity, prevStock, newStock, notes ?? 'Stock purchase', userId ?? null]
        );
        await db.execAsync('COMMIT');
      } catch (e) {
        await db.execAsync('ROLLBACK');
        throw e;
      }
    },

    /** Adjust stock (manual correction) */
    async adjustStock(productId: number, newQuantity: number, reason?: string, userId?: number): Promise<void> {
      const product = await db.getFirstAsync<{ current_stock: number }>('SELECT current_stock FROM products WHERE id = ?', [productId]);
      if (!product) throw new Error('Product not found');

      const prevStock = product.current_stock;
      const diff = newQuantity - prevStock;

      await db.execAsync('BEGIN TRANSACTION');
      try {
        await db.runAsync("UPDATE products SET current_stock = ?, updated_at = datetime('now') WHERE id = ?", [newQuantity, productId]);
        await db.runAsync(
          'INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [productId, 'ADJUSTMENT', Math.abs(diff), prevStock, newQuantity, reason ?? 'Manual adjustment', userId ?? null]
        );
        await db.execAsync('COMMIT');
      } catch (e) {
        await db.execAsync('ROLLBACK');
        throw e;
      }
    },

    /** Get stock movement history for a product */
    async getMovements(productId?: number, limit: number = 100): Promise<StockMovement[]> {
      if (productId) {
        return db.getAllAsync<StockMovement>(
          `SELECT sm.*, p.name as product_name, p.sku as product_sku, u.full_name as created_by_name
           FROM stock_movements sm LEFT JOIN products p ON sm.product_id = p.id LEFT JOIN users u ON sm.created_by_id = u.id
           WHERE sm.product_id = ? ORDER BY sm.created_at DESC LIMIT ?`, [productId, limit]
        );
      }
      return db.getAllAsync<StockMovement>(
        `SELECT sm.*, p.name as product_name, p.sku as product_sku, u.full_name as created_by_name
         FROM stock_movements sm LEFT JOIN products p ON sm.product_id = p.id LEFT JOIN users u ON sm.created_by_id = u.id
         ORDER BY sm.created_at DESC LIMIT ?`, [limit]
      );
    },

    /** Get low stock products */
    async getLowStock(): Promise<Array<{ id: number; name: string; sku: string; current_stock: number; reorder_level: number; category_name: string }>> {
      return db.getAllAsync(
        `SELECT p.id, p.name, p.sku, p.current_stock, p.reorder_level, c.name as category_name
         FROM products p LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1 AND p.current_stock <= p.reorder_level ORDER BY p.current_stock ASC`
      );
    },

    /** Get inventory summary */
    async getSummary(): Promise<{ totalProducts: number; totalStockValue: number; lowStockCount: number; outOfStockCount: number }> {
      const [row] = await db.getAllAsync<{ total: number; value: number; low: number; out: number }>(
        `SELECT COUNT(*) as total,
                COALESCE(SUM(current_stock * cost_price), 0) as value,
                SUM(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out
         FROM products WHERE is_active = 1`
      );
      return {
        totalProducts: row?.total ?? 0,
        totalStockValue: row?.value ?? 0,
        lowStockCount: row?.low ?? 0,
        outOfStockCount: row?.out ?? 0,
      };
    },
  };
}
