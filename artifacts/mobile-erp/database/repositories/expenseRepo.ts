/**
 * Expense repository — CRUD for business expenses
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  reference: string | null;
  created_by_id: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export function createExpenseRepo(db: SQLiteDB) {
  return {
    async list(filters?: { fromDate?: string; toDate?: string; category?: string }): Promise<Expense[]> {
      const conditions: string[] = [];
      const params: any[] = [];
      if (filters?.fromDate) { conditions.push('e.expense_date >= ?'); params.push(filters.fromDate); }
      if (filters?.toDate) { conditions.push('e.expense_date <= ?'); params.push(filters.toDate); }
      if (filters?.category) { conditions.push('e.category = ?'); params.push(filters.category); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      return db.getAllAsync<Expense>(
        `SELECT e.*, u.full_name as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by_id = u.id ${where} ORDER BY e.expense_date DESC`, params
      );
    },

    async getById(id: number): Promise<Expense | null> {
      return db.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
    },

    async create(data: { category: string; description: string; amount: number; expense_date: string; payment_method: string; reference?: string; created_by_id?: number }): Promise<number> {
      const r = await db.runAsync(
        'INSERT INTO expenses (category, description, amount, expense_date, payment_method, reference, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.category, data.description, data.amount, data.expense_date, data.payment_method, data.reference ?? null, data.created_by_id ?? null]
      );
      return r.lastInsertRowId;
    },

    async update(id: number, data: Partial<Expense>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];
      const allowed = ['category', 'description', 'amount', 'expense_date', 'payment_method', 'reference'];
      for (const [k, v] of Object.entries(data)) {
        if (allowed.includes(k) && v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async delete(id: number): Promise<void> {
      await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
    },

    async getMonthlyTotal(month?: string): Promise<number> {
      const m = month || new Date().toISOString().slice(0, 7);
      const row = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ?", [`${m}%`]
      );
      return row?.total ?? 0;
    },

    async getCategories(): Promise<string[]> {
      const rows = await db.getAllAsync<{ category: string }>('SELECT DISTINCT category FROM expenses ORDER BY category');
      return rows.map(r => r.category);
    },
  };
}
