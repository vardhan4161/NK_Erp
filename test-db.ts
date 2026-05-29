import { createSalesRepo } from './artifacts/mobile-erp/database/repositories/salesRepo';
import { createReportRepo } from './artifacts/mobile-erp/database/repositories/reportRepo';
import { getDatabase, initializeDatabase } from './artifacts/mobile-erp/database/db';

async function test() {
  const db = await getDatabase();
  
  // mock the necessary tables for sales
  const tables = (db as any)._db ? (db as any)._db.tables : (db as any).tables;
  
  console.log('Inserting sale...');
  await db.runAsync(
    `INSERT INTO sales (invoice_number, customer_name, subtotal, discount_amount, total_tax, grand_total, payment_method, amount_paid, change_amount, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['INV-001', 'Test User', 100, 0, 18, 118, 'CASH', 118, 0, 'COMPLETED', new Date().toISOString()]
  );
  
  const reportRepo = createReportRepo(db);
  const stats = await reportRepo.getDashboardStats();
  console.log('Dashboard stats:', stats);
  
  const sales = await reportRepo.getSalesByDay();
  console.log('Sales by day:', sales);
}

test().catch(console.error);
