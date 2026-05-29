/**
 * Category repository — CRUD operations for product categories
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  image_uri: string | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export function createCategoryRepo(db: SQLiteDB) {
  return {
    async list(): Promise<Category[]> {
      return db.getAllAsync<Category>(
        `SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1 GROUP BY c.id ORDER BY c.name`
      );
    },

    async getById(id: number): Promise<Category | null> {
      return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
    },

    async create(name: string, description?: string, icon?: string, imageUri?: string): Promise<number> {
      const r = await db.runAsync(
        'INSERT INTO categories (name, description, icon, image_uri) VALUES (?, ?, ?, ?)',
        [name, description ?? null, icon ?? null, imageUri ?? null]
      );
      return r.lastInsertRowId;
    },

    async update(id: number, data: Partial<{ name: string; description: string; icon: string; image_uri: string }>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async delete(id: number): Promise<void> {
      const products = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM products WHERE category_id = ?', [id]);
      if ((products?.cnt ?? 0) > 0) throw new Error('Cannot delete category with existing products');
      await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    },
  };
}
