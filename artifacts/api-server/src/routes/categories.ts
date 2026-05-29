import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { CreateCategoryBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

/** GET /api/categories */
router.get("/categories", requireAuth, async (_req, res) => {
  try {
    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        description: categoriesTable.description,
        productCount: sql<number>`cast(count(${productsTable.id}) as int)`,
        createdAt: categoriesTable.createdAt,
      })
      .from(categoriesTable)
      .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.name);

    res.json(
      categories.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    logger.error({ err }, "List categories error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/categories */
router.post("/categories", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
    res.status(201).json({
      id: cat.id,
      name: cat.name,
      description: cat.description ?? null,
      productCount: 0,
      createdAt: cat.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "Category name already exists" });
      return;
    }
    logger.error({ err }, "Create category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/categories/:id */
router.patch("/categories/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const [cat] = await db
      .update(categoriesTable)
      .set(parsed.data)
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!cat) { res.status(404).json({ error: "Category not found" }); return; }

    const [{ cnt }] = await db
      .select({ cnt: count(productsTable.id) })
      .from(productsTable)
      .where(eq(productsTable.categoryId, id));

    res.json({
      id: cat.id,
      name: cat.name,
      description: cat.description ?? null,
      productCount: Number(cnt),
      createdAt: cat.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Update category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/categories/:id */
router.delete("/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [deleted] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Category not found" }); return; }
    res.json({ message: "Category deleted" });
  } catch (err: any) {
    if (err?.code === "23503") {
      res.status(400).json({ error: "Cannot delete category with products" });
      return;
    }
    logger.error({ err }, "Delete category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
