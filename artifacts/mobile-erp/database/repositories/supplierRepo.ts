/**
 * Supplier repository — CRUD for vendors/suppliers
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function createSupplierRepo(db: SQLiteDB) {
  return {
    async list(search?: string): Promise<Supplier[]> {
      if (search) {
        const term = `%${search}%`;
        return db.getAllAsync<Supplier>('SELECT * FROM suppliers WHERE name LIKE ? OR phone LIKE ? ORDER BY name', [term, term]);
      }
      return db.getAllAsync<Supplier>('SELECT * FROM suppliers ORDER BY name');
    },

    async getById(id: number): Promise<Supplier | null> {
      return db.getFirstAsync<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id]);
    },

    async create(data: Partial<Supplier>): Promise<number> {
      const r = await db.runAsync(
        'INSERT INTO suppliers (name, phone, email, address, gstin, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [data.name ?? '', data.phone ?? null, data.email ?? null, data.address ?? null, data.gstin ?? null, data.notes ?? null]
      );
      return r.lastInsertRowId;
    },

    async update(id: number, data: Partial<Supplier>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];
      const allowed = ['name', 'phone', 'email', 'address', 'gstin', 'notes'];
      for (const [k, v] of Object.entries(data)) {
        if (allowed.includes(k) && v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async delete(id: number): Promise<void> {
      await db.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
    },
  };
}
