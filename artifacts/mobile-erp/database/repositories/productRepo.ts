/**
 * Product repository — CRUD, search, filtering, hierarchy queries
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: number;
  category_name?: string;
  brand_id: number | null;
  brand_name?: string;
  model: string | null;
  variant: string | null;
  cost_price: number;
  selling_price: number;
  gst_rate: number;
  current_stock: number;
  reorder_level: number;
  unit: string;
  warranty_months: number;
  supplier_id: number | null;
  supplier_name?: string;
  image_uri: string | null;
  specifications: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  sku?: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category_id: number;
  brand_id?: number | null;
  model?: string | null;
  variant?: string | null;
  cost_price: number;
  selling_price: number;
  gst_rate: number;
  current_stock?: number;
  reorder_level?: number;
  unit?: string;
  warranty_months?: number;
  supplier_id?: number | null;
  image_uri?: string | null;
  specifications?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  barcode?: string | null;
  category_id?: number;
  brand_id?: number | null;
  model?: string | null;
  variant?: string | null;
  cost_price?: number;
  selling_price?: number;
  gst_rate?: number;
  reorder_level?: number;
  unit?: string;
  warranty_months?: number;
  supplier_id?: number | null;
  image_uri?: string | null;
  specifications?: string | null;
  is_active?: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  brandId?: number;
  lowStock?: boolean;
  isActive?: boolean;
}

export function createProductRepo(db: SQLiteDB) {
  const BASE_SELECT = `
    SELECT p.*, c.name as category_name, b.name as brand_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
  `;

  return {
    /** Get all products with optional filters */
    async list(filters?: ProductFilters): Promise<Product[]> {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters?.search) {
        conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.model LIKE ?)");
        const term = `%${filters.search}%`;
        params.push(term, term, term, term);
      }
      if (filters?.categoryId) {
        conditions.push("p.category_id = ?");
        params.push(filters.categoryId);
      }
      if (filters?.brandId) {
        conditions.push("p.brand_id = ?");
        params.push(filters.brandId);
      }
      if (filters?.lowStock) {
        conditions.push("p.current_stock <= p.reorder_level");
      }
      if (filters?.isActive !== undefined) {
        conditions.push("p.is_active = ?");
        params.push(filters.isActive ? 1 : 0);
      } else {
        conditions.push("p.is_active = 1");
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      return db.getAllAsync<Product>(`${BASE_SELECT} ${where} ORDER BY p.name`, params);
    },

    /** Get a single product by ID */
    async getById(id: number): Promise<Product | null> {
      return db.getFirstAsync<Product>(`${BASE_SELECT} WHERE p.id = ?`, [id]);
    },

    /** Get a product by barcode */
    async getByBarcode(barcode: string): Promise<Product | null> {
      return db.getFirstAsync<Product>(`${BASE_SELECT} WHERE p.barcode = ? AND p.is_active = 1`, [barcode]);
    },

    /** Get a product by SKU */
    async getBySku(sku: string): Promise<Product | null> {
      return db.getFirstAsync<Product>(`${BASE_SELECT} WHERE p.sku = ? AND p.is_active = 1`, [sku]);
    },

    /** Create a new product */
    async create(input: CreateProductInput): Promise<number> {
      const sku = input.sku || await generateSku(db, input.category_id);
      const result = await db.runAsync(
        `INSERT INTO products (sku, barcode, name, description, category_id, brand_id, model, variant, cost_price, selling_price, gst_rate, current_stock, reorder_level, unit, warranty_months, supplier_id, image_uri, specifications)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sku, input.barcode ?? null, input.name, input.description ?? null, input.category_id, input.brand_id ?? null, input.model ?? null, input.variant ?? null, input.cost_price, input.selling_price, input.gst_rate, input.current_stock ?? 0, input.reorder_level ?? 5, input.unit ?? 'pcs', input.warranty_months ?? 0, input.supplier_id ?? null, input.image_uri ?? null, input.specifications ?? null]
      );
      return result.lastInsertRowId;
    },

    /** Update an existing product */
    async update(id: number, input: UpdateProductInput): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];

      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (fields.length === 0) return;

      fields.push("updated_at = datetime('now')");
      params.push(id);
      await db.runAsync(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    /** Soft-delete a product */
    async deactivate(id: number): Promise<void> {
      await db.runAsync("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?", [id]);
    },

    /** Reactivate a product */
    async activate(id: number): Promise<void> {
      await db.runAsync("UPDATE products SET is_active = 1, updated_at = datetime('now') WHERE id = ?", [id]);
    },

    /** Get product count */
    async count(activeOnly = true): Promise<number> {
      const row = await db.getFirstAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM products ${activeOnly ? 'WHERE is_active = 1' : ''}`
      );
      return row?.cnt ?? 0;
    },

    /** Get low stock products */
    async getLowStock(): Promise<Product[]> {
      return db.getAllAsync<Product>(
        `${BASE_SELECT} WHERE p.is_active = 1 AND p.current_stock <= p.reorder_level ORDER BY p.current_stock ASC`
      );
    },

    /** Get product hierarchy: categories with brands and product counts */
    async getHierarchy(): Promise<Array<{ category_id: number; category_name: string; brand_id: number | null; brand_name: string | null; product_count: number }>> {
      return db.getAllAsync(
        `SELECT p.category_id, c.name as category_name, p.brand_id, b.name as brand_name, COUNT(*) as product_count
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN brands b ON p.brand_id = b.id
         WHERE p.is_active = 1
         GROUP BY p.category_id, p.brand_id
         ORDER BY c.name, b.name`
      );
    },

    /** Update stock quantity directly */
    async updateStock(id: number, newStock: number): Promise<void> {
      await db.runAsync("UPDATE products SET current_stock = ?, updated_at = datetime('now') WHERE id = ?", [newStock, id]);
    },
  };
}

/** Generate an auto-incrementing SKU based on category */
async function generateSku(db: SQLiteDB, categoryId: number): Promise<string> {
  const cat = await db.getFirstAsync<{ name: string }>('SELECT name FROM categories WHERE id = ?', [categoryId]);
  const prefix = (cat?.name || 'PRD').replace(/\s+/g, '').toUpperCase().slice(0, 3);
  const row = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM products WHERE sku LIKE ?', [`${prefix}-%`]);
  const num = (row?.cnt ?? 0) + 1;
  return `${prefix}-${String(num).padStart(3, '0')}`;
}
