import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { CreateExpenseBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatExpense(e: any) {
  return {
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    expenseDate: e.expenseDate,
    paymentMethod: e.paymentMethod,
    reference: e.reference ?? null,
    createdBy: e.createdBy ?? null,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
}

/** GET /api/expenses */
router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const conditions: any[] = [];

    if (fromDate) conditions.push(gte(expensesTable.expenseDate, fromDate as string));
    if (toDate) conditions.push(lte(expensesTable.expenseDate, toDate as string));

    const expenses = await db
      .select({
        id: expensesTable.id,
        category: expensesTable.category,
        description: expensesTable.description,
        amount: expensesTable.amount,
        expenseDate: expensesTable.expenseDate,
        paymentMethod: expensesTable.paymentMethod,
        reference: expensesTable.reference,
        createdBy: usersTable.fullName,
        createdAt: expensesTable.createdAt,
      })
      .from(expensesTable)
      .leftJoin(usersTable, eq(expensesTable.createdById, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${expensesTable.expenseDate} desc`);

    res.json(expenses.map(formatExpense));
  } catch (err) {
    logger.error({ err }, "List expenses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/expenses */
router.post("/expenses", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" }); return;
  }

  try {
    const [expense] = await db
      .insert(expensesTable)
      .values({ ...parsed.data, amount: String(parsed.data.amount), createdById: req.user!.userId })
      .returning();

    res.status(201).json(formatExpense({ ...expense, createdBy: null }));
  } catch (err) {
    logger.error({ err }, "Create expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/expenses/:id */
router.patch("/expenses/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" }); return;
  }

  try {
    const [expense] = await db
      .update(expensesTable)
      .set({ ...parsed.data, amount: String(parsed.data.amount) })
      .where(eq(expensesTable.id, id))
      .returning();

    if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
    res.json(formatExpense({ ...expense, createdBy: null }));
  } catch (err) {
    logger.error({ err }, "Update expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/expenses/:id */
router.delete("/expenses/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    res.json({ message: "Expense deleted" });
  } catch (err) {
    logger.error({ err }, "Delete expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
