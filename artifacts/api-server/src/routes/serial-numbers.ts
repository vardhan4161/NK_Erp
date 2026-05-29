import { Router } from "express";
import { db } from "@workspace/db";
import { serialNumbersTable, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { CreateSerialNumberBody, UpdateSerialNumberBody } from "@workspace/api-zod";

const router = Router();

const selectFields = {
  id: serialNumbersTable.id,
  productId: serialNumbersTable.productId,
  productName: productsTable.name,
  serialNumber: serialNumbersTable.serialNumber,
  imei1: serialNumbersTable.imei1,
  imei2: serialNumbersTable.imei2,
  status: serialNumbersTable.status,
  saleId: serialNumbersTable.saleId,
  purchasePrice: serialNumbersTable.purchasePrice,
  notes: serialNumbersTable.notes,
  createdAt: serialNumbersTable.createdAt,
};

function formatSerial(s: any): object {
  return {
    id: s.id,
    productId: s.productId,
    productName: s.productName ?? "",
    serialNumber: s.serialNumber,
    imei1: s.imei1 ?? null,
    imei2: s.imei2 ?? null,
    status: s.status,
    saleId: s.saleId ?? null,
    purchasePrice: s.purchasePrice != null ? Number(s.purchasePrice) : null,
    notes: s.notes ?? null,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  };
}

router.get("/serial-numbers", requireAuth, async (req, res) => {
  try {
    const { productId, status } = req.query;
    const conditions: ReturnType<typeof eq>[] = [];
    if (productId) conditions.push(eq(serialNumbersTable.productId, Number(productId)));
    if (status && typeof status === "string") conditions.push(eq(serialNumbersTable.status, status as any));

    const rows = await db
      .select(selectFields)
      .from(serialNumbersTable)
      .leftJoin(productsTable, eq(serialNumbersTable.productId, productsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(serialNumbersTable.createdAt));

    res.json(rows.map(formatSerial));
  } catch (err) {
    logger.error({ err }, "Failed to list serial numbers");
    res.status(500).json({ error: "Failed to list serial numbers" });
  }
});

router.post("/serial-numbers", requireAuth, async (req, res) => {
  try {
    const parsed = CreateSerialNumberBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });

    const [sn] = await db
      .insert(serialNumbersTable)
      .values({
        productId: parsed.data.productId,
        serialNumber: parsed.data.serialNumber,
        imei1: parsed.data.imei1 ?? null,
        imei2: parsed.data.imei2 ?? null,
        purchasePrice: parsed.data.purchasePrice?.toString() ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning();

    const [withProduct] = await db
      .select(selectFields)
      .from(serialNumbersTable)
      .leftJoin(productsTable, eq(serialNumbersTable.productId, productsTable.id))
      .where(eq(serialNumbersTable.id, sn.id));

    res.status(201).json(formatSerial(withProduct));
  } catch (err: any) {
    if (err?.code === "23505") return void res.status(409).json({ error: "Serial number already exists" });
    logger.error({ err }, "Failed to create serial number");
    res.status(500).json({ error: "Failed to create serial number" });
  }
});

router.patch("/serial-numbers/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const parsed = UpdateSerialNumberBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });

    await db.update(serialNumbersTable).set(parsed.data).where(eq(serialNumbersTable.id, id));

    const [withProduct] = await db
      .select(selectFields)
      .from(serialNumbersTable)
      .leftJoin(productsTable, eq(serialNumbersTable.productId, productsTable.id))
      .where(eq(serialNumbersTable.id, id));

    if (!withProduct) return void res.status(404).json({ error: "Serial number not found" });
    res.json(formatSerial(withProduct));
  } catch (err) {
    logger.error({ err }, "Failed to update serial number");
    res.status(500).json({ error: "Failed to update serial number" });
  }
});

export default router;
