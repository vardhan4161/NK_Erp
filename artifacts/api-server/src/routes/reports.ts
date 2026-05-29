import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, productsTable, categoriesTable, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

/** GET /api/reports/dashboard */
router.get("/reports/dashboard", requireAuth, async (_req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's stats
    const [todayStats] = await db
      .select({
        revenue: sql<number>`coalesce(sum(cast(${salesTable.grandTotal} as numeric)), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(salesTable)
      .where(and(gte(salesTable.createdAt, todayStart), sql`${salesTable.status} != 'RETURNED'`));

    // Month stats
    const [monthStats] = await db
      .select({
        revenue: sql<number>`coalesce(sum(cast(${salesTable.grandTotal} as numeric)), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(salesTable)
      .where(and(gte(salesTable.createdAt, monthStart), sql`${salesTable.status} != 'RETURNED'`));

    // Month expenses
    const [monthExpenses] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${expensesTable.amount} as numeric)), 0)` })
      .from(expensesTable)
      .where(gte(expensesTable.expenseDate, monthStart.toISOString().split("T")[0]));

    // Cost of goods sold this month
    const [monthCogs] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${saleItemsTable.quantity} as numeric) * cast(${productsTable.costPrice} as numeric)), 0)` })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(and(gte(salesTable.createdAt, monthStart), sql`${salesTable.status} != 'RETURNED'`));

    // Product stats
    const [{ totalProducts }] = await db
      .select({ totalProducts: sql<number>`count(*)` })
      .from(productsTable)
      .where(eq(productsTable.isActive, true));

    const [{ lowStockCount }] = await db
      .select({ lowStockCount: sql<number>`count(*)` })
      .from(productsTable)
      .where(and(eq(productsTable.isActive, true), sql`${productsTable.currentStock} <= ${productsTable.reorderLevel}`));

    // Unique customers this month
    const [{ totalCustomers }] = await db
      .select({ totalCustomers: sql<number>`count(distinct ${salesTable.customerPhone})` })
      .from(salesTable)
      .where(gte(salesTable.createdAt, monthStart));

    // Pending returns
    const [{ pendingReturns }] = await db
      .select({ pendingReturns: sql<number>`count(*)` })
      .from(salesTable)
      .where(eq(salesTable.status, "PARTIAL_RETURN"));

    const monthRevenue = Number(monthStats.revenue);
    const monthExpensesVal = Number(monthExpenses.total);
    const monthCost = Number(monthCogs.total);
    const monthProfit = monthRevenue - monthCost - monthExpensesVal;

    res.json({
      todayRevenue: Number(todayStats.revenue),
      todaySalesCount: Number(todayStats.count),
      monthRevenue,
      monthSalesCount: Number(monthStats.count),
      totalProducts: Number(totalProducts),
      lowStockCount: Number(lowStockCount),
      monthExpenses: monthExpensesVal,
      monthProfit,
      totalCustomers: Number(totalCustomers),
      pendingReturns: Number(pendingReturns),
    });
  } catch (err) {
    logger.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/reports/sales-by-day */
router.get("/reports/sales-by-day", requireAuth, async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const rows = await db
      .select({
        date: sql<string>`date(${salesTable.createdAt})`,
        revenue: sql<number>`coalesce(sum(cast(${salesTable.grandTotal} as numeric)), 0)`,
        salesCount: sql<number>`count(*)`,
      })
      .from(salesTable)
      .where(and(gte(salesTable.createdAt, fromDate), sql`${salesTable.status} != 'RETURNED'`))
      .groupBy(sql`date(${salesTable.createdAt})`)
      .orderBy(sql`date(${salesTable.createdAt})`);

    // Compute profit per day using a subquery
    const profitRows = await db
      .select({
        date: sql<string>`date(${salesTable.createdAt})`,
        cost: sql<number>`coalesce(sum(cast(${saleItemsTable.quantity} as numeric) * cast(${productsTable.costPrice} as numeric)), 0)`,
      })
      .from(salesTable)
      .leftJoin(saleItemsTable, eq(saleItemsTable.saleId, salesTable.id))
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(and(gte(salesTable.createdAt, fromDate), sql`${salesTable.status} != 'RETURNED'`))
      .groupBy(sql`date(${salesTable.createdAt})`);

    const profitMap = new Map(profitRows.map((r) => [r.date, Number(r.cost)]));

    res.json(
      rows.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
        salesCount: Number(r.salesCount),
        profit: Number(r.revenue) - (profitMap.get(r.date) ?? 0),
      }))
    );
  } catch (err) {
    logger.error({ err }, "Sales by day error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/reports/top-products */
router.get("/reports/top-products", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const conditions: any[] = [];
    if (req.query.fromDate) conditions.push(gte(salesTable.createdAt, new Date(req.query.fromDate as string)));
    if (req.query.toDate) {
      const end = new Date(req.query.toDate as string);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(salesTable.createdAt, end));
    }

    const rows = await db
      .select({
        productId: saleItemsTable.productId,
        productName: productsTable.name,
        sku: productsTable.sku,
        categoryName: categoriesTable.name,
        quantitySold: sql<number>`cast(sum(${saleItemsTable.quantity}) as int)`,
        revenue: sql<number>`coalesce(sum(cast(${saleItemsTable.totalPrice} as numeric)), 0)`,
      })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(and(
        conditions.length > 0 ? and(...conditions) : undefined,
        sql`${salesTable.status} != 'RETURNED'`
      ))
      .groupBy(saleItemsTable.productId, productsTable.name, productsTable.sku, categoriesTable.name)
      .orderBy(desc(sql`sum(${saleItemsTable.quantity})`))
      .limit(limit);

    res.json(
      rows.map((r) => ({
        productId: r.productId,
        productName: r.productName ?? "",
        sku: r.sku ?? "",
        categoryName: r.categoryName ?? "",
        quantitySold: Number(r.quantitySold),
        revenue: Number(r.revenue),
      }))
    );
  } catch (err) {
    logger.error({ err }, "Top products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/reports/gst */
router.get("/reports/gst", requireAuth, async (req, res) => {
  try {
    const conditions: any[] = [sql`${salesTable.status} != 'RETURNED'`];
    if (req.query.fromDate) conditions.push(gte(salesTable.createdAt, new Date(req.query.fromDate as string)));
    if (req.query.toDate) {
      const end = new Date(req.query.toDate as string);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(salesTable.createdAt, end));
    }

    const [row] = await db
      .select({
        totalSales: sql<number>`coalesce(sum(cast(${salesTable.grandTotal} as numeric)), 0)`,
        totalCgst: sql<number>`coalesce(sum(cast(${salesTable.cgst} as numeric)), 0)`,
        totalSgst: sql<number>`coalesce(sum(cast(${salesTable.sgst} as numeric)), 0)`,
        totalIgst: sql<number>`coalesce(sum(cast(${salesTable.igst} as numeric)), 0)`,
        totalTax: sql<number>`coalesce(sum(cast(${salesTable.totalTax} as numeric)), 0)`,
        transactionCount: sql<number>`count(*)`,
      })
      .from(salesTable)
      .where(and(...conditions));

    res.json({
      totalSales: Number(row.totalSales),
      totalCgst: Number(row.totalCgst),
      totalSgst: Number(row.totalSgst),
      totalIgst: Number(row.totalIgst),
      totalTax: Number(row.totalTax),
      transactionCount: Number(row.transactionCount),
    });
  } catch (err) {
    logger.error({ err }, "GST report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/reports/profit-loss */
router.get("/reports/profit-loss", requireAuth, async (req, res) => {
  try {
    const conditions: any[] = [sql`${salesTable.status} != 'RETURNED'`];
    if (req.query.fromDate) conditions.push(gte(salesTable.createdAt, new Date(req.query.fromDate as string)));
    if (req.query.toDate) {
      const end = new Date(req.query.toDate as string);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(salesTable.createdAt, end));
    }

    const [salesRow] = await db
      .select({ revenue: sql<number>`coalesce(sum(cast(${salesTable.grandTotal} as numeric)), 0)` })
      .from(salesTable)
      .where(and(...conditions));

    const [cogsRow] = await db
      .select({ cost: sql<number>`coalesce(sum(cast(${saleItemsTable.quantity} as numeric) * cast(${productsTable.costPrice} as numeric)), 0)` })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(and(...conditions));

    // Expenses for same period
    const expConditions: any[] = [];
    if (req.query.fromDate) expConditions.push(gte(expensesTable.expenseDate, (req.query.fromDate as string).split("T")[0]));
    if (req.query.toDate) expConditions.push(lte(expensesTable.expenseDate, (req.query.toDate as string).split("T")[0]));

    const [expRow] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${expensesTable.amount} as numeric)), 0)` })
      .from(expensesTable)
      .where(expConditions.length > 0 ? and(...expConditions) : undefined);

    const revenue = Number(salesRow.revenue);
    const cogs = Number(cogsRow.cost);
    const totalExpenses = Number(expRow.total);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      revenue,
      costOfGoods: cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    });
  } catch (err) {
    logger.error({ err }, "Profit loss error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/reports/category-sales */
router.get("/reports/category-sales", requireAuth, async (req, res) => {
  try {
    const conditions: any[] = [sql`${salesTable.status} != 'RETURNED'`];
    if (req.query.fromDate) conditions.push(gte(salesTable.createdAt, new Date(req.query.fromDate as string)));
    if (req.query.toDate) {
      const end = new Date(req.query.toDate as string);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(salesTable.createdAt, end));
    }

    const rows = await db
      .select({
        categoryId: categoriesTable.id,
        categoryName: categoriesTable.name,
        quantitySold: sql<number>`cast(sum(${saleItemsTable.quantity}) as int)`,
        revenue: sql<number>`coalesce(sum(cast(${saleItemsTable.totalPrice} as numeric)), 0)`,
      })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(and(...conditions))
      .groupBy(categoriesTable.id, categoriesTable.name)
      .orderBy(desc(sql`sum(cast(${saleItemsTable.totalPrice} as numeric))`));

    const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue), 0);

    res.json(
      rows.map((r) => ({
        categoryId: r.categoryId ?? 0,
        categoryName: r.categoryName ?? "Uncategorized",
        quantitySold: Number(r.quantitySold),
        revenue: Number(r.revenue),
        percentage: totalRevenue > 0 ? (Number(r.revenue) / totalRevenue) * 100 : 0,
      }))
    );
  } catch (err) {
    logger.error({ err }, "Category sales error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
