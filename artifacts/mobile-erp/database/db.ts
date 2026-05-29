/**
 * Database initialization, migration, and seeding for NK Enterprises ERP
 * Uses expo-sqlite for on-device SQLite storage
 * Falls back to in-memory mock for web platform
 */
import { Platform } from 'react-native';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import {
  SEED_SETTINGS,
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_BRANDS,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
} from './seedData';

const DB_NAME = 'nk_enterprises_erp.db';

// Type for the database instance
interface DatabaseInstance {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId?: number; changes: number}>;
  getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>;
  closeAsync?(): Promise<void>;
}

let _db: DatabaseInstance | null = null;

/**
 * Get or create the database instance
 */
async function openNativeDatabase(): Promise<DatabaseInstance> {
  const SQLite = require('expo-sqlite');
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

/**
 * In-memory mock database for web preview
 * Implements the same interface as expo-sqlite
 */
function createWebDatabase(): DatabaseInstance {
  // In-memory tables stored as arrays
  const tables: Record<string, any[]> = {};
  let autoIncrements: Record<string, number> = {};

  // Parse and track tables from schema
  const tableNames = [
    'settings', 'users', 'categories', 'brands', 'suppliers',
    'products', 'serial_numbers', 'customers', 'sales',
    'sale_items', 'stock_movements', 'expenses'
  ];
  for (const t of tableNames) {
    tables[t] = [];
    autoIncrements[t] = 1;
  }

  function getTable(name: string): any[] {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }

  function parseQuery(sql: string, params: any[] = []): { type: string; table: string } {
    const s = sql.trim().toUpperCase();
    let table = '';
    if (s.startsWith('INSERT')) {
      const m = sql.match(/INTO\s+(\w+)/i);
      table = m ? m[1] : '';
      return { type: 'INSERT', table };
    }
    if (s.startsWith('SELECT')) {
      const m = sql.match(/FROM\s+(\w+)/i);
      table = m ? m[1] : '';
      return { type: 'SELECT', table };
    }
    if (s.startsWith('UPDATE')) {
      const m = sql.match(/UPDATE\s+(\w+)/i);
      table = m ? m[1] : '';
      return { type: 'UPDATE', table };
    }
    if (s.startsWith('DELETE')) {
      const m = sql.match(/FROM\s+(\w+)/i);
      table = m ? m[1] : '';
      return { type: 'DELETE', table };
    }
    return { type: 'OTHER', table: '' };
  }

  const db = {
    execAsync: async (sql: string) => {
      // Handle CREATE TABLE, PRAGMA, BEGIN/COMMIT/ROLLBACK — just ignore
      return;
    },

    runAsync: async (sql: string, params: any[] = []) => {
      const { type, table } = parseQuery(sql, params);
      if (type === 'INSERT') {
        const id = autoIncrements[table] || 1;
        autoIncrements[table] = id + 1;

        // Parse column names from INSERT
        const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
        const cols = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];

        const row: any = { id };
        cols.forEach((col, i) => {
          row[col] = params[i] !== undefined ? params[i] : null;
        });
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        row.status = row.status !== undefined && row.status !== null ? row.status : (table === 'sales' ? 'COMPLETED' : null);
        row.is_active = row.is_active !== undefined && row.is_active !== null ? row.is_active : (table === 'products' ? 1 : null);
        if (table === 'customers') {
          row.total_purchases = row.total_purchases !== undefined && row.total_purchases !== null ? row.total_purchases : 0;
          row.due_amount = row.due_amount !== undefined && row.due_amount !== null ? row.due_amount : 0;
        }

        getTable(table).push(row);
        return { lastInsertRowId: id, changes: 1 };
      }

      if (type === 'UPDATE') {
        // Simple WHERE id = ? handling
        const idParam = params[params.length - 1];
        const rows = getTable(table);
        const row = rows.find(r => r.id === idParam);
        if (row) {
          // Parse SET clause
          const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
          if (setMatch) {
            const setParts = setMatch[1].split(',');
            let paramIdx = 0;
            for (const part of setParts) {
              const [col] = part.trim().split('=').map(s => s.trim());
              if (col && !col.includes('datetime')) {
                row[col] = params[paramIdx];
                paramIdx++;
              }
            }
          }
        }
        return { changes: row ? 1 : 0 };
      }

      if (type === 'DELETE') {
        const idParam = params[0];
        const rows = getTable(table);
        const idx = rows.findIndex(r => r.id === idParam);
        if (idx >= 0) rows.splice(idx, 1);
        return { changes: idx >= 0 ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    getAllAsync: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
      const { type, table } = parseQuery(sql, params);
      let rows = [...getTable(table)];

      // Handle JOINs by adding related fields BEFORE we evaluate WHERE filters
      if (sql.includes('categories c') || sql.includes('categories ON')) {
        rows = rows.map(r => ({
          ...r,
          category_name: getTable('categories').find(c => c.id === r.category_id)?.name || '',
        }));
      }
      if (sql.includes('brands b') || sql.includes('brands ON')) {
        rows = rows.map(r => ({
          ...r,
          brand_name: getTable('brands').find(b => b.id === r.brand_id)?.name || '',
        }));
      }
      if (sql.includes('suppliers') && !table.startsWith('supplier')) {
        rows = rows.map(r => ({
          ...r,
          supplier_name: getTable('suppliers').find(s => s.id === r.supplier_id)?.name || '',
        }));
      }
      if (sql.includes('products p') || sql.includes('products ON')) {
        rows = rows.map(r => {
          const prod = getTable('products').find(p => p.id === r.product_id);
          return {
            ...r,
            product_name: prod?.name || r.product_name || '',
            product_sku: prod?.sku || r.product_sku || '',
            sku: prod?.sku || r.sku || '',
            cost_price: prod?.cost_price !== undefined ? prod.cost_price : r.cost_price || 0,
            selling_price: prod?.selling_price !== undefined ? prod.selling_price : r.selling_price || 0,
            category_id: prod?.category_id || r.category_id,
            category_name: getTable('categories').find(c => c.id === (prod?.category_id || r.category_id))?.name || '',
          };
        });
      }
      if (sql.includes('sales s') || sql.includes('sales ON')) {
        rows = rows.map(r => {
          const sale = getTable('sales').find(s => s.id === r.sale_id);
          return {
            ...r,
            created_at: sale?.created_at || r.created_at,
            status: sale?.status || r.status,
          };
        });
      }
      if (sql.includes('users u') || sql.includes('users ON')) {
        rows = rows.map(r => ({
          ...r,
          created_by_name: getTable('users').find(u => u.id === r.created_by_id)?.full_name || '',
        }));
      }

      // Handle WHERE clauses
      if (sql.toUpperCase().includes('WHERE')) {
        const whereClause = sql.split(/WHERE/i)[1];
        // Clean out ORDER BY, LIMIT, GROUP BY if they are appended in the where clause split
        const cleanWhere = whereClause.split(/ORDER BY|LIMIT|GROUP BY/i)[0].trim();
        const comparisons = cleanWhere.split(/\s+AND\s+/i);
        let paramIdx = 0;

        for (const comp of comparisons) {
          if (comp.includes('OR')) {
            // Text search across multiple fields
            const term = String(params[paramIdx] || '').replace(/%/g, '').toLowerCase();
            const placeholdersCount = (comp.match(/\?/g) || []).length;
            paramIdx += placeholdersCount;
            if (term) {
              rows = rows.filter(r =>
                Object.values(r).some(v => String(v || '').toLowerCase().includes(term))
              );
            }
          } else {
            // Clean up comp to extract column, operator, and values
            const opMatch = comp.match(/(=|LIKE|!=|>=|<=)/i);
            if (opMatch) {
              const op = opMatch[1].toUpperCase();
              const parts = comp.split(op);
              let colExpr = parts[0].trim();
              let valExpr = parts[1].trim();

              // Extract column name: remove table prefixes like s. or p., remove functions like date()
              let col = colExpr.toLowerCase();
              col = col.replace(/^(date\()?([a-z0-9_]+\.)?([a-z0-9_]+)(\))?$/, '$3');

              // Determine value
              let val: any;
              if (valExpr === '?') {
                val = params[paramIdx];
                paramIdx++;
              } else if (valExpr.toLowerCase().includes("date('now')") || valExpr.toLowerCase().includes('date("now")') || valExpr.toLowerCase() === "date('now')") {
                val = new Date().toISOString().split('T')[0];
              } else {
                // Static value: strip quotes
                val = valExpr.replace(/^['"]|['"]$/g, '');
                // Try parsing number
                if (!isNaN(Number(val)) && val !== '') {
                  val = Number(val);
                }
              }

              if (val !== undefined && val !== null) {
                rows = rows.filter(r => {
                  let dbVal = r[col] !== undefined ? r[col] : r[colExpr];
                  if (dbVal === undefined) return true; // Keep if column not in row

                  // If it's a date check, e.g. date(created_at) = '2026-05-28'
                  if (colExpr.toLowerCase().includes('date(') && typeof dbVal === 'string') {
                    dbVal = dbVal.split('T')[0].split(' ')[0];
                  }

                  const strDbVal = String(dbVal).toLowerCase();
                  const strVal = String(val).toLowerCase();

                  if (op === '=') {
                    return strDbVal == strVal;
                  } else if (op === '!=') {
                    return strDbVal != strVal;
                  } else if (op === 'LIKE') {
                    const term = strVal.replace(/%/g, '');
                    return strDbVal.includes(term);
                  } else if (op === '>=') {
                    return strDbVal >= strVal;
                  } else if (op === '<=') {
                    return strDbVal <= strVal;
                  }
                  return true;
                });
              }
            }
          }
        }
      }

      // Handle Group By
      if (sql.toUpperCase().includes('GROUP BY')) {
        const groupByPart = sql.split(/GROUP BY/i)[1].split(/ORDER BY|LIMIT/i)[0].trim();
        const groupByExprs = groupByPart.split(',').map(e => e.trim());
        const groupKeys = groupByExprs.map(expr => {
          let col = expr.toLowerCase();
          // Strip date() or table prefixes
          col = col.replace(/^(date\()?([a-z0-9_]+\.)?([a-z0-9_]+)(\))?$/, '$3');
          return { expr, col };
        });

        const groups: Record<string, any[]> = {};
        rows.forEach(r => {
          let key = '';
          if (groupKeys.length === 0) {
            key = 'all';
          } else {
            key = groupKeys.map(gk => {
              const isDateExpr = gk.expr.toLowerCase().includes('date(') || gk.col === 'created_at' || gk.col === 'expense_date';
              if (isDateExpr) {
                const dateVal = r[gk.col] || r.created_at || r.expense_date || new Date().toISOString();
                return dateVal.split('T')[0].split(' ')[0];
              }
              const val = r[gk.col] !== undefined ? r[gk.col] : r[gk.expr];
              return val !== undefined && val !== null ? String(val) : 'null';
            }).join('::');
          }
          if (!groups[key]) groups[key] = [];
          groups[key].push(r);
        });

        const selectPart = sql.split(/SELECT/i)[1].split(/FROM/i)[0];
        const fields = selectPart.split(',');
        const results: any[] = [];

        Object.keys(groups).forEach(groupKey => {
          const groupRows = groups[groupKey];
          const aggResult: any = {};
          const firstRow = groupRows[0];

          fields.forEach(field => {
            const trimmed = field.trim();
            if (trimmed === '*' || trimmed.endsWith('.*')) {
              // Copy all fields from the first row of the group
              if (firstRow) {
                Object.assign(aggResult, firstRow);
              }
              return;
            }

            const aliasMatch = trimmed.match(/as\s+(\w+)/i) || trimmed.match(/\s+(\w+)$/i);
            const alias = aliasMatch ? aliasMatch[1].trim() : trimmed.replace(/^\w+\./, '');

            if (alias) {
              if (trimmed.toUpperCase().includes('SUM(')) {
                const colMatch = trimmed.match(/SUM\(([^)]+)\)/i);
                const expr = colMatch ? colMatch[1].trim() : '';
                let sum = 0;
                groupRows.forEach(r => {
                  if (expr.includes('*')) {
                    const parts = expr.split('*');
                    const col1 = parts[0].replace(/^\w+\./, '').trim();
                    const col2 = parts[1].replace(/^\w+\./, '').trim();
                    const v1 = parseFloat(r[col1]) || 0;
                    let v2 = parseFloat(r[col2]) || 0;
                    if (col2 === 'cost_price' && r[col2] === undefined) {
                      v2 = (parseFloat(r['unit_price']) || 0) * 0.7;
                    }
                    sum += v1 * v2;
                  } else {
                    const col = expr.replace(/^\w+\./, '');
                    sum += parseFloat(r[col]) || 0;
                  }
                });
                aggResult[alias] = sum;
              } else if (trimmed.toUpperCase().includes('COUNT(') || trimmed.toUpperCase().includes('COUNT(*)')) {
                // Special override for categories and brands product count in web-mock
                if (trimmed.toUpperCase().includes('COUNT(P.ID)') || alias === 'product_count') {
                  if (table === 'categories') {
                    aggResult[alias] = getTable('products').filter(p => p.category_id === firstRow.id && p.is_active === 1).length;
                  } else if (table === 'brands') {
                    aggResult[alias] = getTable('products').filter(p => p.brand_id === firstRow.id && p.is_active === 1).length;
                  } else {
                    aggResult[alias] = groupRows.length;
                  }
                } else {
                  aggResult[alias] = groupRows.length;
                }
              } else if (trimmed.toLowerCase().includes('date(') || trimmed.toLowerCase().includes('created_at') || trimmed.toLowerCase().includes('expense_date')) {
                const dateVal = firstRow.created_at || firstRow.expense_date || new Date().toISOString();
                aggResult[alias] = dateVal.split('T')[0].split(' ')[0];
              } else {
                // Standard column value
                const rawField = trimmed.split(/\s+as\s+/i)[0].trim();
                const cleanField = rawField.replace(/^\w+\./, '');
                let val = firstRow[alias];
                if (val === undefined) val = firstRow[cleanField];
                if (val === undefined) val = firstRow[rawField];
                aggResult[alias] = val !== undefined ? val : null;
              }
            }
          });
          results.push(aggResult);
        });

        // ORDER BY
        if (sql.toUpperCase().includes('ORDER BY')) {
          const orderMatch = sql.match(/ORDER\s+BY\s+([\w.]+)\s*(ASC|DESC)?/i);
          if (orderMatch) {
            const orderColExpr = orderMatch[1].trim();
            const orderCol = orderColExpr.toLowerCase().replace(/^(date\()?([a-z0-9_]+\.)?([a-z0-9_]+)(\))?$/, '$3');
            const isDesc = orderMatch[2] && orderMatch[2].toUpperCase() === 'DESC';

            results.sort((a, b) => {
              let valA = a[orderCol] !== undefined ? a[orderCol] : a[orderColExpr];
              let valB = b[orderCol] !== undefined ? b[orderCol] : b[orderColExpr];

              if (valA === undefined && a.date !== undefined) valA = a.date;
              if (valB === undefined && b.date !== undefined) valB = b.date;
              if (valA === undefined && a.revenue !== undefined) valA = a.revenue;
              if (valB === undefined && b.revenue !== undefined) valB = b.revenue;
              if (valA === undefined && a.quantity_sold !== undefined) valA = a.quantity_sold;
              if (valB === undefined && b.quantity_sold !== undefined) valB = b.quantity_sold;

              if (valA === undefined || valB === undefined) return 0;

              let cmp = 0;
              if (typeof valA === 'number' && typeof valB === 'number') {
                cmp = valA - valB;
              } else {
                cmp = String(valA).localeCompare(String(valB));
              }
              return isDesc ? -cmp : cmp;
            });
          } else {
            results.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
          }
        }
        return results as T[];
      }

      // Handle aggregations if select columns contain SUM, COUNT, etc. (without GROUP BY)
      if (sql.toUpperCase().includes('SUM(') || sql.toUpperCase().includes('COUNT(') || sql.toUpperCase().includes('COUNT(*)')) {
        const selectPart = sql.split(/SELECT/i)[1].split(/FROM/i)[0];
        const fields = selectPart.split(',');
        const aggResult: any = {};

        fields.forEach(field => {
          const aliasMatch = field.match(/as\s+(\w+)/i) || field.match(/\s+(\w+)$/i);
          const alias = aliasMatch ? aliasMatch[1].trim() : '';

          if (alias) {
            if (field.toUpperCase().includes('SUM(')) {
              const colMatch = field.match(/SUM\(([^)]+)\)/i);
              const expr = colMatch ? colMatch[1].trim() : '';
              let sum = 0;
              rows.forEach(r => {
                if (expr.toUpperCase().includes('CASE WHEN')) {
                  const stock = parseInt(r['current_stock']) || 0;
                  const reorder = parseInt(r['reorder_level']) || 5;
                  if (stock <= reorder) {
                    sum += 1;
                  }
                } else if (expr.includes('*')) {
                  const parts = expr.split('*');
                  const col1 = parts[0].replace(/^\w+\./, '').trim();
                  const col2 = parts[1].replace(/^\w+\./, '').trim();
                  const v1 = parseFloat(r[col1]) || 0;
                  let v2 = parseFloat(r[col2]) || 0;
                  if (col2 === 'cost_price' && r[col2] === undefined) {
                    v2 = (parseFloat(r['unit_price']) || 0) * 0.7;
                  }
                  sum += v1 * v2;
                } else {
                  const col = expr.replace(/^\w+\./, '');
                  sum += parseFloat(r[col]) || 0;
                }
              });
              aggResult[alias] = sum;
            } else if (field.toUpperCase().includes('COUNT(') || field.toUpperCase().includes('COUNT(*)')) {
              aggResult[alias] = rows.length;
            }
          }
        });

        return [aggResult as T];
      }

      // Handle aggregations for product_count
      if (sql.includes('product_count') || sql.includes('COUNT(p.id)')) {
        const grouped = rows.map(r => ({
          ...r,
          product_count: getTable('products').filter(p => {
            if (table === 'categories') return p.category_id === r.id;
            if (table === 'brands') return p.brand_id === r.id;
            return false;
          }).length,
        }));
        return grouped as T[];
      }

      // ORDER BY for non-grouped queries
      if (sql.toUpperCase().includes('ORDER BY')) {
        const orderMatch = sql.match(/ORDER\s+BY\s+([\w.]+)\s*(ASC|DESC)?/i);
        if (orderMatch) {
          const orderColExpr = orderMatch[1].trim();
          const orderCol = orderColExpr.toLowerCase().replace(/^(date\()?([a-z0-9_]+\.)?([a-z0-9_]+)(\))?$/, '$3');
          const isDesc = orderMatch[2] && orderMatch[2].toUpperCase() === 'DESC';

          rows.sort((a, b) => {
            let valA = a[orderCol] !== undefined ? a[orderCol] : a[orderColExpr];
            let valB = b[orderCol] !== undefined ? b[orderCol] : b[orderColExpr];

            if (valA === undefined || valB === undefined) return 0;

            let cmp = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
              cmp = valA - valB;
            } else {
              cmp = String(valA).localeCompare(String(valB));
            }
            return isDesc ? -cmp : cmp;
          });
        }
      }

      // LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        rows = rows.slice(0, parseInt(limitMatch[1]));
      }

      return rows as T[];
    },

    getFirstAsync: async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
      const results = await db.getAllAsync<T>(sql, params);
      return results.length > 0 ? results[0] : null;
    },
  };

  return db;
}

/**
 * Get or create the database instance
 */
export async function getDatabase(): Promise<DatabaseInstance> {
  if (_db) return _db;

  if (Platform.OS === 'web') {
    _db = createWebDatabase();
  } else {
    _db = await openNativeDatabase();
  }
  return _db;
}

/**
 * Initialize the database: create tables, run migrations, seed data
 * Called once on app startup
 */
export async function initializeDatabase(): Promise<DatabaseInstance> {
  const db = await getDatabase();

  // Check if database is already initialized
  const existingVersion = await getSchemaVersion(db);

  if (existingVersion === 0) {
    // First launch: create all tables and seed data
    console.log('[DB] First launch — creating tables...');
    await db.execAsync(CREATE_TABLES_SQL);
    console.log('[DB] Tables created. Seeding data...');
    await seedDatabase(db);
    console.log('[DB] Seed complete. Database ready!');
  } else if (existingVersion < SCHEMA_VERSION) {
    console.log(`[DB] Upgrading from v${existingVersion} to v${SCHEMA_VERSION}...`);
  } else {
    console.log(`[DB] Database v${existingVersion} already up-to-date.`);
  }

  return db;
}

/**
 * Check current schema version (0 = not initialized)
 */
async function getSchemaVersion(db: DatabaseInstance): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'schema_version'"
    );
    return result ? parseInt(result.value, 10) : 0;
  } catch {
    return 0; // Table doesn't exist yet
  }
}

/**
 * Seed the database with initial data
 */
async function seedDatabase(db: DatabaseInstance): Promise<void> {
  // 1. Settings
  for (const s of SEED_SETTINGS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [s.key, s.value]
    );
  }

  // 2. Users
  for (const u of SEED_USERS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO users (username, full_name, pin_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [u.username, u.full_name, u.pin_hash, u.role, u.is_active]
    );
  }

  // 3. Categories
  for (const c of SEED_CATEGORIES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (name, description, icon) VALUES (?, ?, ?)',
      [c.name, c.description, c.icon]
    );
  }

  // 4. Brands
  for (const b of SEED_BRANDS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO brands (name, description) VALUES (?, ?)',
      [b.name, b.description]
    );
  }

  // 5. Products (resolve category/brand IDs by name)
  const categories = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM categories');
  const brands = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM brands');
  const catMap = new Map(categories.map((c: any) => [c.name, c.id]));
  const brandMap = new Map(brands.map((b: any) => [b.name, b.id]));

  for (const p of SEED_PRODUCTS) {
    const categoryId = catMap.get(p.category) ?? 1;
    const brandId = brandMap.get(p.brand) ?? 1;
    await db.runAsync(
      `INSERT OR IGNORE INTO products (sku, barcode, name, category_id, brand_id, model, variant, cost_price, selling_price, gst_rate, current_stock, reorder_level, warranty_months, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.sku, p.barcode, p.name, categoryId, brandId, p.model, p.variant, p.cost_price, p.selling_price, p.gst_rate, p.stock, p.reorder, p.warranty, (p as any).image || null]
    );
  }

  // 6. Customers
  for (const c of SEED_CUSTOMERS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO customers (name, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?)',
      [c.name, c.phone ?? null, c.email ?? null, c.address ?? null, c.gstin ?? null]
    );
  }

  // 7. Suppliers
  const suppliers = [
    { name: 'Samsung India Electronics', phone: '1800-40-7267', email: 'b2b@samsung.com', address: 'Noida, UP' },
    { name: 'LG Electronics India', phone: '1800-315-9999', email: 'dealer@lg.com', address: 'Greater Noida, UP' },
    { name: 'Havells India Ltd', phone: '1800-103-1313', email: 'sales@havells.com', address: 'Noida, UP' },
  ];
  for (const s of suppliers) {
    await db.runAsync(
      'INSERT OR IGNORE INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [s.name, s.phone, s.email, s.address]
    );
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (_db && Platform.OS !== 'web' && _db.closeAsync) {
    await _db.closeAsync();
  }
  _db = null;
}

/**
 * Delete the entire database (for testing/reset)
 */
export async function resetDatabase(): Promise<void> {
  await closeDatabase();
  if (Platform.OS !== 'web') {
    const SQLite = require('expo-sqlite');
    await SQLite.deleteDatabaseAsync(DB_NAME);
  }
  _db = null;
}

export { _db as db };
