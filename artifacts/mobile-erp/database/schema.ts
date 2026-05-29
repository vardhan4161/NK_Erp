/**
 * SQLite Database Schema for NK Enterprises ERP
 * All tables defined as CREATE TABLE statements
 * Used by the migration system on first launch
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- App settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT
);

-- Users / Staff accounts
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','manager','salesperson','accountant')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Product brands
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  logo_uri TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Suppliers / Vendors
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Products (full hierarchy: category -> brand -> model -> variant)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand_id INTEGER REFERENCES brands(id),
  model TEXT,
  variant TEXT,
  cost_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  gst_rate REAL NOT NULL DEFAULT 18,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  warranty_months INTEGER NOT NULL DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id),
  image_uri TEXT,
  specifications TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Serial / IMEI number tracking
CREATE TABLE IF NOT EXISTS serial_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  serial_number TEXT NOT NULL UNIQUE,
  imei1 TEXT,
  imei2 TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','SOLD','DEFECTIVE')),
  sale_id INTEGER REFERENCES sales(id),
  purchase_price REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  total_purchases REAL NOT NULL DEFAULT 0,
  due_amount REAL NOT NULL DEFAULT 0,
  loyalty_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sales / Invoices
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_gstin TEXT,
  is_inter_state INTEGER NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  cgst REAL NOT NULL DEFAULT 0,
  sgst REAL NOT NULL DEFAULT 0,
  igst REAL NOT NULL DEFAULT 0,
  total_tax REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  amount_paid REAL NOT NULL DEFAULT 0,
  change_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','RETURNED','PARTIAL_RETURN')),
  notes TEXT,
  created_by_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sale line items
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT,
  product_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  gst_rate REAL NOT NULL DEFAULT 0,
  gst_amount REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0
);

-- Stock movement audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK(movement_type IN ('PURCHASE','SALE','RETURN','ADJUSTMENT')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Business expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  reference TEXT,
  created_by_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_serial_product ON serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_serial_status ON serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
`;
