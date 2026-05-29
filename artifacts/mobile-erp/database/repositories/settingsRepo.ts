/**
 * Settings repository — Key-value app settings stored in SQLite
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface AppSettings {
  shop_name: string;
  shop_address: string;
  shop_gstin: string;
  shop_phone1: string;
  shop_phone2: string;
  shop_email: string;
  invoice_prefix: string;
  show_gstin_on_invoice: string;
  theme: string;
  currency_symbol: string;
  auto_lock_minutes: string;
}

export function createSettingsRepo(db: SQLiteDB) {
  return {
    async get(key: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
      return row?.value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    },

    async getAll(): Promise<Record<string, string>> {
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    },

    async setMultiple(settings: Record<string, string>): Promise<void> {
      for (const [key, value] of Object.entries(settings)) {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    },

    async getShopDetails(): Promise<AppSettings> {
      const all = await this.getAll();
      return {
        shop_name: all.shop_name ?? 'NK Enterprises',
        shop_address: all.shop_address ?? 'Chegunta, Telangana',
        shop_gstin: all.shop_gstin ?? '36BHLPN7476G1ZR',
        shop_phone1: all.shop_phone1 ?? '9701987402',
        shop_phone2: all.shop_phone2 ?? '9490251262',
        shop_email: all.shop_email ?? '',
        invoice_prefix: all.invoice_prefix ?? 'NK',
        show_gstin_on_invoice: all.show_gstin_on_invoice ?? 'true',
        theme: all.theme ?? 'dark_blue',
        currency_symbol: all.currency_symbol ?? '₹',
        auto_lock_minutes: all.auto_lock_minutes ?? '30',
      };
    },
  };
}
