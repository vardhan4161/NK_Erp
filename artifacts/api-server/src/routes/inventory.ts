import { Router } from "express";
import { db } from "@workspace/db";
import { stockMovementsTable, productsTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { CreateStockMovementBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatMovement(m: any) {
  return {
    id: m.id,
    productId: m.productId,
    productName: m.productName ?? "",
    productSku: m.productSku ?? "",
    movementType: m.movementType,
    quantity: m.quantity,
    previousStock: m.previousStock,
    newStock: m.newStock,
    reference: m.reference ?? null,
    notes: m.notes ?? null,
    createdBy: m.createdBy ?? null,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  };
}

/** GET /api/inventory/movements */
router.get("/inventory/movements", requireAuth, async (req, res) => {
  try {
    const { productId, movementType, fromDate, toDate } = req.query;

    const conditions: any[] = [];
    if (productId) conditions.push(eq(stockMovementsTable.productId, Number(productId)));
    if (movementType) conditions.push(eq(stockMovementsTable.movementType, movementType as any));
    if (fromDate) conditions.push(gte(stockMovementsTable.createdAt, new Date(fromDate as string)));
    if (toDate) {
      const end = new Date(toDate as string);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(stockMovementsTable.createdAt, end));
    }

    const movements = await db
      .select({
        id: stockMovementsTable.id,
        productId: stockMovementsTable.productId,
        productName: productsTable.name,
        productSku: productsTable.sku,
        movementType: stockMovementsTable.movementType,
        quantity: stockMovementsTable.quantity,
        previousStock: stockMovementsTable.previousStock,
        newStock: stockMovementsTable.newStock,
        reference: stockMovementsTable.reference,
        notes: stockMovementsTable.notes,
        createdBy: usersTable.fullName,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
      .leftJoin(usersTable, eq(stockMovementsTable.createdById, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${stockMovementsTable.createdAt} desc`)
      .limit(500);

    res.json(movements.map(formatMovement));
  } catch (err) {
    logger.error({ err }, "List stock movements error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/inventory/movements */
router.post("/inventory/movements", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const parsed = CreateStockMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const { productId, movementType, quantity, reference, notes } = parsed.data;

    // Get current stock
    const [product] = await db
      .select({ currentStock: productsTable.currentStock, name: productsTable.name, sku: productsTable.sku })
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const previousStock = product.currentStock;
    let newStock: number;

    if (movementType === "PURCHASE" || movementType === "RETURN") {
      newStock = previousStock + quantity;
    } else if (movementType === "ADJUSTMENT") {
      // quantity can be signed; treat as absolute for now
      newStock = Math.max(0, previousStock + quantity);
    } else {
      res.status(400).json({ error: "Invalid movement type for manual creation" });
      return;
    }

    // Update stock
    await db.update(productsTable).set({ currentStock: newStock }).where(eq(productsTable.id, productId));

    // Record movement
    const [movement] = await db
      .insert(stockMovementsTable)
      .values({
        productId,
        movementType,
        quantity,
        previousStock,
        newStock,
        reference: reference ?? null,
        notes: notes ?? null,
        createdById: req.user!.userId,
      })
      .returning();

    res.status(201).json(formatMovement({
      ...movement,
      productName: product.name,
      productSku: product.sku,
      createdBy: null,
    }));
  } catch (err) {
    logger.error({ err }, "Create stock movement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/inventory/low-stock */
router.get("/inventory/low-stock", requireAuth, async (_req, res) => {
  try {
    const products = await db
      .select({
        id: productsTable.id,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        name: productsTable.name,
        description: productsTable.description,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        brand: productsTable.brand,
        model: productsTable.model,
        costPrice: productsTable.costPrice,
        sellingPrice: productsTable.sellingPrice,
        gstRate: productsTable.gstRate,
        currentStock: productsTable.currentStock,
        reorderLevel: productsTable.reorderLevel,
        unit: productsTable.unit,
        isActive: productsTable.isActive,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(and(
        eq(productsTable.isActive, true),
        sql`${productsTable.currentStock} <= ${productsTable.reorderLevel}`
      ))
      .orderBy(productsTable.currentStock);

    res.json(products.map((p) => ({
      id: p.id,
      sku: p.sku,
      barcode: p.barcode ?? null,
      name: p.name,
      description: p.description ?? null,
      categoryId: p.categoryId,
      categoryName: p.categoryName ?? "",
      brand: p.brand ?? null,
      model: p.model ?? null,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      gstRate: Number(p.gstRate),
      currentStock: p.currentStock,
      reorderLevel: p.reorderLevel,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Low stock error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
