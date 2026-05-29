/**
 * Barrel export for all database repositories
 * Creates all repos from a single SQLite database instance
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }
import { createProductRepo } from './productRepo';
import { createCategoryRepo } from './categoryRepo';
import { createBrandRepo } from './brandRepo';
import { createSupplierRepo } from './supplierRepo';
import { createCustomerRepo } from './customerRepo';
import { createSalesRepo } from './salesRepo';
import { createInventoryRepo } from './inventoryRepo';
import { createReportRepo } from './reportRepo';
import { createExpenseRepo } from './expenseRepo';
import { createUserRepo } from './userRepo';
import { createSettingsRepo } from './settingsRepo';

export function createRepositories(db: any) {
  return {
    products: createProductRepo(db),
    categories: createCategoryRepo(db),
    brands: createBrandRepo(db),
    suppliers: createSupplierRepo(db),
    customers: createCustomerRepo(db),
    sales: createSalesRepo(db),
    inventory: createInventoryRepo(db),
    reports: createReportRepo(db),
    expenses: createExpenseRepo(db),
    users: createUserRepo(db),
    settings: createSettingsRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

// Re-export types
export type { Product, CreateProductInput, UpdateProductInput, ProductFilters } from './productRepo';
export type { Category } from './categoryRepo';
export type { Brand } from './brandRepo';
export type { Supplier } from './supplierRepo';
export type { Customer, CustomerPurchase } from './customerRepo';
export type { Sale, SaleItem, CartItem, CreateSaleInput } from './salesRepo';
export type { StockMovement } from './inventoryRepo';
export type { DashboardStats, SalesByDay, TopProduct, GstReport, ProfitLoss, CategorySales } from './reportRepo';
export type { Expense } from './expenseRepo';
export type { User } from './userRepo';
export type { AppSettings } from './settingsRepo';
