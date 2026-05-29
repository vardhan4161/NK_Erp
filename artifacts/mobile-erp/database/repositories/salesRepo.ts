/**
 * Sales repository — Create sales (POS), list, search, returns
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_gstin: string | null;
  is_inter_state: number;
  subtotal: number;
  discount_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  grand_total: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  status: string;
  notes: string | null;
  created_by_id: number | null;
  created_by_name?: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string | null;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  total_price: number;
}

export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  currentStock: number;
  costPrice: number;
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  customerId?: number;
  isInterState?: boolean;
  discountAmount?: number;
  paymentMethod: string;
  amountPaid: number;
  notes?: string;
  createdById?: number;
  items: CartItem[];
}

export function createSalesRepo(db: SQLiteDB) {
  return {
    /** Create a complete sale (transaction: sale + items + stock updates) */
    async createSale(input: CreateSaleInput): Promise<Sale> {
      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      const processedItems: Array<CartItem & { gstAmount: number; totalPrice: number }> = [];

      for (const item of input.items) {
        const lineBase = item.unitPrice * item.quantity - item.discount;
        const gstAmount = (lineBase * item.gstRate) / 100;
        const totalPrice = lineBase + gstAmount;

        subtotal += lineBase;
        totalTax += gstAmount;
        processedItems.push({ ...item, gstAmount, totalPrice });
      }

      const discountAmount = input.discountAmount ?? 0;
      let cgst = 0, sgst = 0, igst = 0;
      if (input.isInterState) {
        igst = totalTax;
      } else {
        cgst = totalTax / 2;
        sgst = totalTax / 2;
      }

      const grandTotal = subtotal + totalTax - discountAmount;
      const changeAmount = Math.max(0, input.amountPaid - grandTotal);
      const invoiceNumber = generateInvoiceNumber();

      // Use a transaction for atomicity
      await db.execAsync('BEGIN TRANSACTION');

      try {
        // Insert sale
        const saleResult = await db.runAsync(
          `INSERT INTO sales (invoice_number, customer_id, customer_name, customer_phone, customer_gstin, is_inter_state, subtotal, discount_amount, cgst, sgst, igst, total_tax, grand_total, payment_method, amount_paid, change_amount, notes, created_by_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoiceNumber, input.customerId ?? null, input.customerName ?? null, input.customerPhone ?? null, input.customerGstin ?? null, input.isInterState ? 1 : 0, subtotal, discountAmount, cgst, sgst, igst, totalTax, grandTotal, input.paymentMethod, input.amountPaid, changeAmount, input.notes ?? null, input.createdById ?? null]
        );
        const saleId = saleResult.lastInsertRowId;

        // Insert sale items and update stock
        for (const item of processedItems) {
          await db.runAsync(
            `INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price, discount, gst_rate, gst_amount, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [saleId, item.productId, item.name, item.sku, item.quantity, item.unitPrice, item.discount, item.gstRate, item.gstAmount, item.totalPrice]
          );

          // Update stock
          const newStock = item.currentStock - item.quantity;
          await db.runAsync('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.productId]);

          // Record stock movement
          await db.runAsync(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, created_by_id)
             VALUES (?, 'SALE', ?, ?, ?, ?, ?)`,
            [item.productId, item.quantity, item.currentStock, newStock, invoiceNumber, input.createdById ?? null]
          );
        }

        // Update customer total purchases if linked
        if (input.customerId) {
          await db.runAsync(
            'UPDATE customers SET total_purchases = total_purchases + ?, updated_at = datetime(\'now\') WHERE id = ?',
            [grandTotal, input.customerId]
          );
          if (input.paymentMethod === 'CREDIT') {
            await db.runAsync(
              'UPDATE customers SET due_amount = due_amount + ?, updated_at = datetime(\'now\') WHERE id = ?',
              [grandTotal, input.customerId]
            );
          }
        }

        await db.execAsync('COMMIT');

        // Return the created sale
        return (await this.getById(saleId))!;
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    },

    /** Get all sales with optional filters */
    async list(filters?: { search?: string; fromDate?: string; toDate?: string; status?: string }): Promise<Sale[]> {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters?.search) {
        conditions.push("(s.invoice_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)");
        const term = `%${filters.search}%`;
        params.push(term, term, term);
      }
      if (filters?.fromDate) {
        conditions.push("s.created_at >= ?");
        params.push(filters.fromDate);
      }
      if (filters?.toDate) {
        conditions.push("s.created_at <= ?");
        params.push(filters.toDate + ' 23:59:59');
      }
      if (filters?.status) {
        conditions.push("s.status = ?");
        params.push(filters.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      return db.getAllAsync<Sale>(
        `SELECT s.*, u.full_name as created_by_name FROM sales s LEFT JOIN users u ON s.created_by_id = u.id ${where} ORDER BY s.created_at DESC LIMIT 500`,
        params
      );
    },

    /** Get sale by ID with items */
    async getById(id: number): Promise<Sale | null> {
      return db.getFirstAsync<Sale>(
        `SELECT s.*, u.full_name as created_by_name FROM sales s LEFT JOIN users u ON s.created_by_id = u.id WHERE s.id = ?`,
        [id]
      );
    },

    /** Get sale items */
    async getItems(saleId: number): Promise<SaleItem[]> {
      return db.getAllAsync<SaleItem>(
        `SELECT si.*, p.name as product_name, p.sku as product_sku FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?`,
        [saleId]
      );
    },

    /** Process a return */
    async processReturn(saleId: number, itemIds: number[], reason?: string, userId?: number): Promise<void> {
      await db.execAsync('BEGIN TRANSACTION');
      try {
        const items = await db.getAllAsync<SaleItem & { current_stock: number }>(
          `SELECT si.*, p.current_stock FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ? AND si.id IN (${itemIds.join(',')})`,
          [saleId]
        );

        for (const item of items) {
          const newStock = item.current_stock + item.quantity;
          await db.runAsync('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.product_id]);
          await db.runAsync(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reference, notes, created_by_id)
             VALUES (?, 'RETURN', ?, ?, ?, ?, ?, ?)`,
            [item.product_id, item.quantity, item.current_stock, newStock, `RETURN-${saleId}`, reason ?? 'Sale return', userId ?? null]
          );
        }

        const allItems = await db.getAllAsync<{ id: number }>('SELECT id FROM sale_items WHERE sale_id = ?', [saleId]);
        const isFullReturn = itemIds.length >= allItems.length;
        await db.runAsync('UPDATE sales SET status = ? WHERE id = ?', [isFullReturn ? 'RETURNED' : 'PARTIAL_RETURN', saleId]);

        await db.execAsync('COMMIT');
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    },

    /** Today's sales count */
    async getTodaySalesCount(): Promise<number> {
      const row = await db.getFirstAsync<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM sales WHERE date(created_at) = date('now') AND status != 'RETURNED'"
      );
      return row?.cnt ?? 0;
    },
  };
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 9000) + 1000;
  return `NK-${y}${m}${d}-${r}`;
}
