/**
 * Customer repository — CRUD, purchase history, warranty, dues
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  notes: string | null;
  total_purchases: number;
  due_amount: number;
  loyalty_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPurchase {
  id: number;
  invoice_number: string;
  grand_total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export function createCustomerRepo(db: SQLiteDB) {
  return {
    async list(search?: string): Promise<Customer[]> {
      if (search) {
        const term = `%${search}%`;
        return db.getAllAsync<Customer>(
          'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name', [term, term]
        );
      }
      return db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name');
    },

    async getById(id: number): Promise<Customer | null> {
      return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
    },

    async getByPhone(phone: string): Promise<Customer | null> {
      return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE phone = ?', [phone]);
    },

    async create(data: { name: string; phone?: string; email?: string; address?: string; gstin?: string; notes?: string }): Promise<number> {
      const r = await db.runAsync(
        'INSERT INTO customers (name, phone, email, address, gstin, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [data.name, data.phone ?? null, data.email ?? null, data.address ?? null, data.gstin ?? null, data.notes ?? null]
      );
      return r.lastInsertRowId;
    },

    async update(id: number, data: Partial<Customer>): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];
      const allowed = ['name', 'phone', 'email', 'address', 'gstin', 'notes', 'loyalty_notes', 'due_amount'];
      for (const [k, v] of Object.entries(data)) {
        if (allowed.includes(k) && v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
      }
      if (fields.length === 0) return;
      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async delete(id: number): Promise<void> {
      await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
    },

    async getPurchaseHistory(customerId: number): Promise<CustomerPurchase[]> {
      return db.getAllAsync<CustomerPurchase>(
        'SELECT id, invoice_number, grand_total, payment_method, status, created_at FROM sales WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );
    },

    async getWarrantyItems(customerId: number): Promise<Array<{ product_name: string; warranty_months: number; purchase_date: string; invoice_number: string }>> {
      return db.getAllAsync(
        `SELECT p.name as product_name, p.warranty_months, s.created_at as purchase_date, s.invoice_number
         FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id
         WHERE s.customer_id = ? AND p.warranty_months > 0 ORDER BY s.created_at DESC`,
        [customerId]
      );
    },

    async recordPayment(customerId: number, amount: number): Promise<void> {
      await db.runAsync(
        "UPDATE customers SET due_amount = MAX(0, due_amount - ?), updated_at = datetime('now') WHERE id = ?",
        [amount, customerId]
      );
    },

    async count(): Promise<number> {
      const row = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM customers');
      return row?.cnt ?? 0;
    },
  };
}
