import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable, stockMovementsTable } from "@workspace/db";
import { eq, ilike, and, lte, isNull, sql } from "drizzle-orm";
import { CreateProductBody, UpdateProductBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function generateSku(categoryName: string, id: number): string {
  const prefix = categoryName.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  return `${prefix}-${String(id).padStart(5, "0")}`;
}

function formatProduct(p: any): object {
  return {
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
    currentStock: Number(p.currentStock),
    reorderLevel: Number(p.reorderLevel),
    unit: p.unit,
    isActive: p.isActive,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

/** GET /api/products */
router.get("/products", requireAuth, async (req, res) => {
  try {
    const { search, categoryId, lowStock, isActive } = req.query;

    const conditions: ReturnType<typeof eq>[] = [];

    if (typeof search === "string" && search) {
      conditions.push(
        sql`(${ilike(productsTable.name, `%${search}%`)} OR ${ilike(productsTable.sku, `%${search}%`)} OR ${ilike(productsTable.barcode ?? productsTable.name, `%${search}%`)})` as any
      );
    }
    if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
    if (lowStock === "true") conditions.push(lte(productsTable.currentStock, productsTable.reorderLevel));
    if (isActive !== undefined) conditions.push(eq(productsTable.isActive, isActive === "true"));

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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(productsTable.name);

    res.json(products.map(formatProduct));
  } catch (err) {
    logger.error({ err }, "List products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/products */
router.post("/products", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  try {
    const { initialStock, ...productData } = parsed.data;

    // Get category name for SKU generation
    const [category] = await db
      .select({ name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, productData.categoryId))
      .limit(1);

    if (!category) {
      res.status(400).json({ error: "Category not found" });
      return;
    }

    // Insert product with temp SKU, then update with real SKU
    const [product] = await db
      .insert(productsTable)
      .values({
        ...productData,
        sku: "TEMP-000",
        currentStock: initialStock,
        costPrice: String(productData.costPrice),
        sellingPrice: String(productData.sellingPrice),
        gstRate: String(productData.gstRate),
      })
      .returning();

    const sku = generateSku(category.name, product.id);
    const [updatedProduct] = await db
      .update(productsTable)
      .set({ sku })
      .where(eq(productsTable.id, product.id))
      .returning();

    // Record initial stock movement
    if (initialStock > 0) {
      await db.insert(stockMovementsTable).values({
        productId: product.id,
        movementType: "PURCHASE",
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        notes: "Initial stock",
      });
    }

    res.status(201).json(formatProduct({ ...updatedProduct, categoryName: category.name }));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "Barcode already exists" });
      return;
    }
    logger.error({ err }, "Create product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/products/barcode/:barcode */
router.get("/products/barcode/:barcode", requireAuth, async (req, res) => {
  try {
    const [product] = await db
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
      .where(and(eq(productsTable.barcode, req.params.barcode), eq(productsTable.isActive, true)))
      .limit(1);

    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Get product by barcode error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/products/:id */
router.get("/products/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [product] = await db
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
      .where(eq(productsTable.id, id))
      .limit(1);

    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/products/:id */
router.patch("/products/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.name != null) updates.name = d.name;
    if (d.description != null) updates.description = d.description;
    if (d.categoryId != null) updates.categoryId = d.categoryId;
    if (d.brand != null) updates.brand = d.brand;
    if (d.model != null) updates.model = d.model;
    if (d.barcode != null) updates.barcode = d.barcode;
    if (d.costPrice != null) updates.costPrice = String(d.costPrice);
    if (d.sellingPrice != null) updates.sellingPrice = String(d.sellingPrice);
    if (d.gstRate != null) updates.gstRate = String(d.gstRate);
    if (d.reorderLevel != null) updates.reorderLevel = d.reorderLevel;
    if (d.unit != null) updates.unit = d.unit;
    if (d.isActive != null) updates.isActive = d.isActive;

    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const [cat] = await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)).limit(1);
    res.json(formatProduct({ ...product, categoryName: cat?.name ?? "" }));
  } catch (err) {
    logger.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/products/:id — soft delete */
router.delete("/products/:id", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, id));
    res.json({ message: "Product deactivated" });
  } catch (err) {
    logger.error({ err }, "Delete product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
