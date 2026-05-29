/**
 * Brand repository — CRUD operations for product brands
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Brand {
  id: number;
  name: string;
  logo_uri: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export function createBrandRepo(db: SQLiteDB) {
  return {
    async list(): Promise<Brand[]> {
      return db.getAllAsync<Brand>(
        `SELECT b.*, COUNT(p.id) as product_count FROM brands b LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = 1 GROUP BY b.id ORDER BY b.name`
      );
    },

    async getById(id: number): Promise<Brand | null> {
      return db.getFirstAsync<Brand>('SELECT * FROM brands WHERE id = ?', [id]);
    },

    async create(name: string, description?: string, logoUri?: string): Promise<number> {
      const r = await db.runAsync('INSERT INTO brands (name, description, logo_uri) VALUES (?, ?, ?)', [name, description ?? null, logoUri ?? null]);
      return r.lastInsertRowId;
    },

    async update(id: number, data: Partial<{ name: string; description: string; logo_uri: string }>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE brands SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async delete(id: number): Promise<void> {
      const products = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM products WHERE brand_id = ?', [id]);
      if ((products?.cnt ?? 0) > 0) throw new Error('Cannot delete brand with existing products');
      await db.runAsync('DELETE FROM brands WHERE id = ?', [id]);
    },
  };
}
