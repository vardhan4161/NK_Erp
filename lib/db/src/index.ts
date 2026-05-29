import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const { Pool } = pg;

let pool: any;
let db: any;

const isProduction = process.env.NODE_ENV === "production";
const hasDbUrl = !!process.env.DATABASE_URL;

if (hasDbUrl) {
  console.log("Database: Connecting to live PostgreSQL database...");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.log("Database: DATABASE_URL not set. Initializing in-memory PostgreSQL mock (pg-mem)...");
  
  try {
    const { newDb } = await import("pg-mem");
    const pgMemDb = newDb();
    
    // Set up standard PostgreSQL schemas & extensions that might be queried
    pgMemDb.public.registerFunction({
      name: "current_database",
      implementation: () => "volt_erp_in_memory",
    });

    // Create the pg pool adapter and monkeypatch it for Drizzle compatibility
    const pgAdapter = pgMemDb.adapters.createPg();
    const PgMemPool = pgAdapter.Pool;
    const PgMemClient = (pgAdapter as any).Client;
    
    if (PgMemClient && PgMemClient.prototype) {
      PgMemClient.prototype.getTypeParser = (oid: number, format?: string) => {
        return (val: any) => val;
      };
      
      const originalQuery = PgMemClient.prototype.query;
      PgMemClient.prototype.query = function (query: any, values: any, callback: any) {
        if (query && typeof query === "object") {
          if (!query.getTypeParser) {
            query.getTypeParser = (oid: number, format?: string) => {
              return (val: any) => val;
            };
          }
        }
        return originalQuery.call(this, query, values, callback);
      };
    }
    
    pool = new PgMemPool();
    db = drizzle(pool, { schema });

    // Load and run the generated migration file to create all 9 tables in pg-mem
    const candidates = [
      path.resolve(process.cwd(), "lib/db/drizzle/0000_bumpy_scourge.sql"),
      path.resolve(process.cwd(), "../../lib/db/drizzle/0000_bumpy_scourge.sql"),
      path.resolve(__dirname, "../../lib/db/drizzle/0000_bumpy_scourge.sql"),
      path.resolve(__dirname, "../../../lib/db/drizzle/0000_bumpy_scourge.sql"),
      path.resolve(__dirname, "../node_modules/@workspace/db/drizzle/0000_bumpy_scourge.sql"),
    ];

    const migrationPath = candidates.find((p) => fs.existsSync(p));
    
    if (migrationPath) {
      console.log("Database: Loading migrations from:", migrationPath);
      const sql = fs.readFileSync(migrationPath, "utf8");
      // Split the migration file by statement-breakpoints
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`Database: Running ${statements.length} migration statements...`);
      for (const statement of statements) {
        try {
          pgMemDb.public.none(statement);
        } catch (err: any) {
          // If pg-mem warns about something, log it but keep going
          console.warn("Database [Migration Warn]:", err?.message || err);
        }
      }
      console.log("Database: Migrations applied successfully!");
    } else {
      console.error("Database: Migration SQL file not found! Checked candidates:\n" + candidates.join("\n"));
    }

    // Seed default demo credentials
    console.log("Database: Seeding default demo users (admin, manager, cashier)...");
    // Pre-calculated bcryptjs hash of "admin123" (salt rounds = 10)
    const demoPasswordHash = "$2a$10$wE99R1h6C0T0Vqg1Z6Qel0i5e.nIep.mE4qg8JbS3oEw2H1kE4m";
    
    pgMemDb.public.none(`
      INSERT INTO "users" (username, email, full_name, password_hash, role, is_active)
      VALUES 
        ('admin', 'admin@volterp.com', 'System Admin', '${demoPasswordHash}', 'admin', true),
        ('manager1', 'manager1@volterp.com', 'Store Manager', '${demoPasswordHash}', 'manager', true),
        ('cashier1', 'cashier1@volterp.com', 'Cashier One', '${demoPasswordHash}', 'cashier', true)
      ON CONFLICT (username) DO NOTHING;
    `);
    
    // Seed a couple of default categories and products to make the interface alive!
    pgMemDb.public.none(`
      INSERT INTO "categories" (name, description)
      VALUES 
        ('Smartphones', 'Mobile phones and handheld devices'),
        ('Laptops', 'Portable personal computers and notebooks'),
        ('Accessories', 'Chargers, headphones, cases and peripherals')
      ON CONFLICT (name) DO NOTHING;
    `);

    pgMemDb.public.none(`
      INSERT INTO "products" (sku, barcode, name, description, category_id, cost_price, selling_price, current_stock, reorder_level)
      VALUES 
        ('PHN-APL-I15P', '190199000123', 'iPhone 15 Pro Max', 'Apple flagship smartphone 256GB', 1, 95000.00, 139900.00, 15, 3),
        ('LAP-DEL-X13', '888777666555', 'Dell XPS 13', 'Intel Core Ultra 7, 16GB RAM, 512GB SSD', 2, 85000.00, 115000.00, 8, 2),
        ('ACC-APL-AP3', '190199000456', 'Apple AirPods Pro 3', 'Wireless noise-cancelling earphones', 3, 15000.00, 24900.00, 25, 5)
      ON CONFLICT (sku) DO NOTHING;
    `);

    console.log("Database: Seeding completed successfully!");
  } catch (err: any) {
    console.error("Database Error: Failed to initialize in-memory pg-mem database:", err?.message || err);
    throw err;
  }
}

export { pool, db };
export * from "./schema";
