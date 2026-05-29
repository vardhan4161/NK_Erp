/**
 * Reports repository — Dashboard stats, sales analytics, profit/loss, GST
 */
// DB type - compatible with both expo-sqlite and web mock
interface SQLiteDB { execAsync(sql: string): Promise<void>; runAsync(sql: string, params?: any[]): Promise<{lastInsertRowId: number; changes: number}>; getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>; getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>; }

export interface DashboardStats {
  todayRevenue: number;
  todaySalesCount: number;
  monthRevenue: number;
  monthSalesCount: number;
  monthProfit: number;
  monthExpenses: number;
  totalProducts: number;
  lowStockCount: number;
  totalCustomers: number;
}

export interface SalesByDay {
  date: string;
  revenue: number;
  salesCount: number;
  profit: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  sku: string;
  category_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface GstReport {
  totalSales: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  transactionCount: number;
}

export interface ProfitLoss {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

export interface CategorySales {
  category_id: number;
  category_name: string;
  quantity_sold: number;
  revenue: number;
  percentage: number;
}

export function createReportRepo(db: SQLiteDB) {
  return {
    async getDashboardStats(): Promise<DashboardStats> {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [todayStats] = await db.getAllAsync<{ revenue: number; cnt: number }>(
        `SELECT SUM(grand_total) as revenue, COUNT(*) as cnt FROM sales WHERE date(created_at) = ? AND status != 'RETURNED'`, [today]
      );
      const [monthStats] = await db.getAllAsync<{ revenue: number; cnt: number }>(
        `SELECT SUM(grand_total) as revenue, COUNT(*) as cnt FROM sales WHERE date(created_at) >= ? AND status != 'RETURNED'`, [monthStart]
      );
      const [monthCogs] = await db.getAllAsync<{ total: number }>(
        `SELECT SUM(si.quantity * si.cost_price) as total FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE date(s.created_at) >= ? AND s.status != 'RETURNED'`, [monthStart]
      );
      const [monthExp] = await db.getAllAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM expenses WHERE expense_date >= ?`, [monthStart]
      );
      const [prodStats] = await db.getAllAsync<{ total: number; low: number }>(
        `SELECT COUNT(*) as total, SUM(CASE WHEN current_stock <= reorder_level THEN 1 ELSE 0 END) as low FROM products WHERE is_active = 1`
      );
      const [custStats] = await db.getAllAsync<{ total: number }>(
        `SELECT COUNT(*) as total FROM customers`
      );

      return {
        todayRevenue: todayStats?.revenue ?? 0,
        todaySalesCount: todayStats?.cnt ?? 0,
        monthRevenue: monthStats?.revenue ?? 0,
        monthSalesCount: monthStats?.cnt ?? 0,
        monthProfit: (monthStats?.revenue ?? 0) - (monthCogs?.total ?? 0) - (monthExp?.total ?? 0),
        monthExpenses: monthExp?.total ?? 0,
        totalProducts: prodStats?.total ?? 0,
        lowStockCount: prodStats?.low ?? 0,
        totalCustomers: custStats?.total ?? 0,
      };
    },

    async getSalesByDay(days: number = 7): Promise<SalesByDay[]> {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const from = fromDate.toISOString().split('T')[0];

      const rows = await db.getAllAsync<{ date: string; revenue: number; cnt: number }>(
        `SELECT date(created_at) as date, SUM(grand_total) as revenue, COUNT(*) as cnt FROM sales WHERE date(created_at) >= ? AND status != 'RETURNED' GROUP BY date(created_at) ORDER BY date(created_at)`, [from]
      );

      const costRows = await db.getAllAsync<{ date: string; cost: number }>(
        `SELECT date(s.created_at) as date, SUM(si.quantity * si.cost_price) as cost FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE date(s.created_at) >= ? AND s.status != 'RETURNED' GROUP BY date(s.created_at)`, [from]
      );
      const costMap = new Map(costRows.map(r => [r.date, r.cost]));

      return rows.map(r => ({
        date: r.date,
        revenue: r.revenue,
        salesCount: r.cnt,
        profit: r.revenue - (costMap.get(r.date) ?? 0),
      }));
    },

    async getTopProducts(limit: number = 10, fromDate?: string, toDate?: string): Promise<TopProduct[]> {
      const conditions = ["s.status != 'RETURNED'"];
      const params: any[] = [];
      if (fromDate) { conditions.push("date(s.created_at) >= ?"); params.push(fromDate); }
      if (toDate) { conditions.push("date(s.created_at) <= ?"); params.push(toDate); }

      return db.getAllAsync<TopProduct>(
        `SELECT si.product_id, p.name as product_name, p.sku, c.name as category_name,
                SUM(si.quantity) as quantity_sold, SUM(si.total_price) as revenue
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE ${conditions.join(' AND ')}
         GROUP BY si.product_id ORDER BY quantity_sold DESC LIMIT ?`,
        [...params, limit]
      );
    },

    async getGstReport(fromDate?: string, toDate?: string): Promise<GstReport> {
      const conditions = ["status != 'RETURNED'"];
      const params: any[] = [];
      if (fromDate) { conditions.push("date(created_at) >= ?"); params.push(fromDate); }
      if (toDate) { conditions.push("date(created_at) <= ?"); params.push(toDate); }

      const [row] = await db.getAllAsync<GstReport>(
        `SELECT COALESCE(SUM(grand_total), 0) as totalSales, COALESCE(SUM(cgst), 0) as totalCgst,
                COALESCE(SUM(sgst), 0) as totalSgst, COALESCE(SUM(igst), 0) as totalIgst,
                COALESCE(SUM(total_tax), 0) as totalTax, COUNT(*) as transactionCount
         FROM sales WHERE ${conditions.join(' AND ')}`, params
      );
      return row ?? { totalSales: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTax: 0, transactionCount: 0 };
    },

    async getProfitLoss(fromDate?: string, toDate?: string): Promise<ProfitLoss> {
      const conditions = ["s.status != 'RETURNED'"];
      const params: any[] = [];
      if (fromDate) { conditions.push("date(s.created_at) >= ?"); params.push(fromDate); }
      if (toDate) { conditions.push("date(s.created_at) <= ?"); params.push(toDate); }

      const [rev] = await db.getAllAsync<{ total: number }>(
        `SELECT COALESCE(SUM(grand_total), 0) as total FROM sales s WHERE ${conditions.join(' AND ')}`, params
      );
      const [cogs] = await db.getAllAsync<{ total: number }>(
        `SELECT COALESCE(SUM(si.quantity * si.cost_price), 0) as total FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE ${conditions.join(' AND ')}`, params
      );

      const expConditions: string[] = [];
      const expParams: any[] = [];
      if (fromDate) { expConditions.push("expense_date >= ?"); expParams.push(fromDate); }
      if (toDate) { expConditions.push("expense_date <= ?"); expParams.push(toDate); }
      const expWhere = expConditions.length > 0 ? `WHERE ${expConditions.join(' AND ')}` : '';
      const [exp] = await db.getAllAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${expWhere}`, expParams
      );

      const revenue = rev?.total ?? 0;
      const cost = cogs?.total ?? 0;
      const expenses = exp?.total ?? 0;
      const grossProfit = revenue - cost;
      const netProfit = grossProfit - expenses;

      return {
        revenue, costOfGoods: cost, grossProfit, totalExpenses: expenses, netProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      };
    },

    async getCategorySales(fromDate?: string, toDate?: string): Promise<CategorySales[]> {
      const conditions = ["s.status != 'RETURNED'"];
      const params: any[] = [];
      if (fromDate) { conditions.push("date(s.created_at) >= ?"); params.push(fromDate); }
      if (toDate) { conditions.push("date(s.created_at) <= ?"); params.push(toDate); }

      const rows = await db.getAllAsync<CategorySales>(
        `SELECT c.id as category_id, c.name as category_name, SUM(si.quantity) as quantity_sold, SUM(si.total_price) as revenue
         FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id LEFT JOIN categories c ON p.category_id = c.id
         WHERE ${conditions.join(' AND ')} GROUP BY c.id ORDER BY revenue DESC`, params
      );
      const total = rows.reduce((a, r) => a + r.revenue, 0);
      return rows.map(r => ({ ...r, percentage: total > 0 ? (r.revenue / total) * 100 : 0 }));
    },
  };
}
