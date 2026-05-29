/**
 * User repository — CRUD, authentication, role management
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface User {
  id: number;
  username: string;
  full_name: string;
  pin_hash: string;
  role: 'admin' | 'manager' | 'salesperson' | 'accountant';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function createUserRepo(db: SQLiteDB) {
  return {
    async list(): Promise<User[]> {
      return db.getAllAsync<User>('SELECT * FROM users ORDER BY full_name');
    },

    async getById(id: number): Promise<User | null> {
      return db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [id]);
    },

    async getByUsername(username: string): Promise<User | null> {
      return db.getFirstAsync<User>('SELECT * FROM users WHERE username = ?', [username]);
    },

    /** Authenticate by PIN — returns user if PIN matches */
    async authenticateByPin(pin: string): Promise<User | null> {
      return db.getFirstAsync<User>('SELECT * FROM users WHERE pin_hash = ? AND is_active = 1', [pin]);
    },

    async create(data: { username: string; full_name: string; pin: string; role: string }): Promise<number> {
      const r = await db.runAsync(
        'INSERT INTO users (username, full_name, pin_hash, role) VALUES (?, ?, ?, ?)',
        [data.username, data.full_name, data.pin, data.role]
      );
      return r.lastInsertRowId;
    },

    async update(id: number, data: Partial<{ username: string; full_name: string; pin_hash: string; role: string; is_active: number }>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async changePin(id: number, newPin: string): Promise<void> {
      await db.runAsync("UPDATE users SET pin_hash = ?, updated_at = datetime('now') WHERE id = ?", [newPin, id]);
    },

    async toggleActive(id: number): Promise<void> {
      await db.runAsync("UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?", [id]);
    },

    async delete(id: number): Promise<void> {
      await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
    },
  };
}
