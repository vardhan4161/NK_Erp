import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable } from "@workspace/db";
import { eq, ilike, or, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { CreateCustomerBody } from "@workspace/api-zod";

const router = Router();

async function formatCustomer(c: typeof customersTable.$inferSelect) {
  const [stats] = await db
    .select({
      total: sql<number>`coalesce(sum(cast(${salesTable.grandTotal} as numeric)), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(salesTable)
    .where(and(eq(salesTable.customerPhone, c.phone), sql`${salesTable.status} != 'RETURNED'`));

  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email ?? null,
    address: c.address ?? null,
    gstin: c.gstin ?? null,
    notes: c.notes ?? null,
    totalPurchases: Number(stats?.total ?? 0),
    purchaseCount: Number(stats?.count ?? 0),
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

router.get("/customers", requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let customers: (typeof customersTable.$inferSelect)[];
    if (typeof search === "string" && search) {
      customers = await db
        .select()
        .from(customersTable)
        .where(or(ilike(customersTable.name, `%${search}%`), ilike(customersTable.phone, `%${search}%`)))
        .orderBy(desc(customersTable.createdAt));
    } else {
      customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
    }
    const result = await Promise.all(customers.map(formatCustomer));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Failed to list customers" });
  }
});

router.post("/customers", requireAuth, async (req, res) => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });
    const [customer] = await db.insert(customersTable).values(parsed.data).returning();
    res.status(201).json(await formatCustomer(customer));
  } catch (err: any) {
    if (err?.code === "23505") return void res.status(409).json({ error: "Customer with this phone already exists" });
    logger.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return void res.status(404).json({ error: "Customer not found" });
    res.json(await formatCustomer(customer));
  } catch (err) {
    logger.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Failed to get customer" });
  }
});

router.patch("/customers/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const parsed = CreateCustomerBody.partial().safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });
    const [customer] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, id)).returning();
    if (!customer) return void res.status(404).json({ error: "Customer not found" });
    res.json(await formatCustomer(customer));
  } catch (err) {
    logger.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ message: "Customer deleted" });
  } catch (err) {
    logger.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

router.get("/customers/:id/sales", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return void res.status(404).json({ error: "Customer not found" });
    const sales = await db
      .select()
      .from(salesTable)
      .where(eq(salesTable.customerPhone, customer.phone))
      .orderBy(desc(salesTable.createdAt));
    res.json(
      sales.map((s) => ({
        ...s,
        subtotal: Number(s.subtotal),
        discountAmount: Number(s.discountAmount),
        cgst: Number(s.cgst),
        sgst: Number(s.sgst),
        igst: Number(s.igst),
        totalTax: Number(s.totalTax),
        grandTotal: Number(s.grandTotal),
        amountPaid: Number(s.amountPaid),
        changeAmount: Number(s.changeAmount),
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      })),
    );
  } catch (err) {
    logger.error({ err }, "Failed to get customer sales");
    res.status(500).json({ error: "Failed to get customer sales" });
  }
});

export default router;
