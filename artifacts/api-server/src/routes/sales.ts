import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, productsTable, stockMovementsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { CreateSaleBody, ReturnSaleBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

/** Generate unique invoice number */
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}${day}-${random}`;
}

function formatSale(s: any) {
  return {
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    customerName: s.customerName ?? null,
    customerPhone: s.customerPhone ?? null,
    customerGstin: s.customerGstin ?? null,
    subtotal: Number(s.subtotal),
    discountAmount: Number(s.discountAmount),
    cgst: Number(s.cgst),
    sgst: Number(s.sgst),
    igst: Number(s.igst),
    totalTax: Number(s.totalTax),
    grandTotal: Number(s.grandTotal),
    paymentMethod: s.paymentMethod,
    amountPaid: Number(s.amountPaid),
    changeAmount: Number(s.changeAmount),
    status: s.status,
    notes: s.notes ?? null,
    createdBy: s.createdBy ?? null,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  };
}

/** GET /api/sales */
router.get("/sales", requireAuth, async (req, res) => {
  try {
    const { fromDate, toDate, search } = req.query;
    const conditions: any[] = [];

    if (fromDate) conditions.push(gte(salesTable.createdAt, new Date(fromDate as string)));
    if (toDate) {
      const end = new Date(toDate as string);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(salesTable.createdAt, end));
    }
    if (search) {
      conditions.push(
        or(
          ilike(salesTable.invoiceNumber, `%${search}%`),
          ilike(salesTable.customerName ?? salesTable.invoiceNumber, `%${search}%`)
        )
      );
    }

    const sales = await db
      .select({
        id: salesTable.id,
        invoiceNumber: salesTable.invoiceNumber,
        customerName: salesTable.customerName,
        customerPhone: salesTable.customerPhone,
        customerGstin: salesTable.customerGstin,
        subtotal: salesTable.subtotal,
        discountAmount: salesTable.discountAmount,
        cgst: salesTable.cgst,
        sgst: salesTable.sgst,
        igst: salesTable.igst,
        totalTax: salesTable.totalTax,
        grandTotal: salesTable.grandTotal,
        paymentMethod: salesTable.paymentMethod,
        amountPaid: salesTable.amountPaid,
        changeAmount: salesTable.changeAmount,
        status: salesTable.status,
        notes: salesTable.notes,
        createdBy: usersTable.fullName,
        createdAt: salesTable.createdAt,
      })
      .from(salesTable)
      .leftJoin(usersTable, eq(salesTable.createdById, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${salesTable.createdAt} desc`)
      .limit(500);

    res.json(sales.map(formatSale));
  } catch (err) {
    logger.error({ err }, "List sales error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/sales */
router.post("/sales", requireAuth, async (req, res) => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  try {
    const body = parsed.data;

    // Validate stock and compute totals
    let subtotal = 0;
    let totalTax = 0;
    const itemDetails: Array<{
      productId: number; name: string; sku: string;
      quantity: number; unitPrice: number; discount: number;
      gstRate: number; gstAmount: number; totalPrice: number;
      currentStock: number; costPrice: number;
    }> = [];

    for (const item of body.items) {
      const [product] = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          gstRate: productsTable.gstRate,
          currentStock: productsTable.currentStock,
          costPrice: productsTable.costPrice,
          isActive: productsTable.isActive,
        })
        .from(productsTable)
        .where(eq(productsTable.id, item.productId))
        .limit(1);

      if (!product || !product.isActive) {
        res.status(400).json({ error: `Product ${item.productId} not found or inactive` });
        return;
      }

      if (product.currentStock < item.quantity) {
        res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.currentStock}` });
        return;
      }

      const lineBase = item.unitPrice * item.quantity - item.discount;
      const gstRate = Number(product.gstRate);
      const gstAmount = (lineBase * gstRate) / 100;
      const totalPrice = lineBase + gstAmount;

      subtotal += item.unitPrice * item.quantity - item.discount;
      totalTax += gstAmount;

      itemDetails.push({
        productId: item.productId,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstRate,
        gstAmount,
        totalPrice,
        currentStock: product.currentStock,
        costPrice: Number(product.costPrice),
      });
    }

    // GST split: intra-state = CGST + SGST; inter-state = IGST
    let cgst = 0, sgst = 0, igst = 0;
    if (body.isInterState) {
      igst = totalTax;
    } else {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    }

    const grandTotal = subtotal + totalTax - (body.discountAmount ?? 0);
    const changeAmount = Math.max(0, body.amountPaid - grandTotal);

    // Generate unique invoice number (retry on collision)
    let invoiceNumber = generateInvoiceNumber();

    // Insert sale
    const [sale] = await db
      .insert(salesTable)
      .values({
        invoiceNumber,
        customerName: body.customerName ?? null,
        customerPhone: body.customerPhone ?? null,
        customerGstin: body.customerGstin ?? null,
        isInterState: body.isInterState,
        subtotal: String(subtotal),
        discountAmount: String(body.discountAmount ?? 0),
        cgst: String(cgst),
        sgst: String(sgst),
        igst: String(igst),
        totalTax: String(totalTax),
        grandTotal: String(grandTotal),
        paymentMethod: body.paymentMethod,
        amountPaid: String(body.amountPaid),
        changeAmount: String(changeAmount),
        notes: body.notes ?? null,
        createdById: req.user!.userId,
      })
      .returning();

    // Insert sale items and update stock
    for (const item of itemDetails) {
      await db.insert(saleItemsTable).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discount: String(item.discount),
        gstRate: String(item.gstRate),
        gstAmount: String(item.gstAmount),
        totalPrice: String(item.totalPrice),
      });

      const newStock = item.currentStock - item.quantity;
      await db.update(productsTable).set({ currentStock: newStock }).where(eq(productsTable.id, item.productId));

      await db.insert(stockMovementsTable).values({
        productId: item.productId,
        movementType: "SALE",
        quantity: item.quantity,
        previousStock: item.currentStock,
        newStock,
        reference: sale.invoiceNumber,
        createdById: req.user!.userId,
      });
    }

    res.status(201).json(formatSale({ ...sale, createdBy: null }));
  } catch (err) {
    logger.error({ err }, "Create sale error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/sales/:id */
router.get("/sales/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [sale] = await db
      .select({
        id: salesTable.id,
        invoiceNumber: salesTable.invoiceNumber,
        customerName: salesTable.customerName,
        customerPhone: salesTable.customerPhone,
        customerGstin: salesTable.customerGstin,
        subtotal: salesTable.subtotal,
        discountAmount: salesTable.discountAmount,
        cgst: salesTable.cgst,
        sgst: salesTable.sgst,
        igst: salesTable.igst,
        totalTax: salesTable.totalTax,
        grandTotal: salesTable.grandTotal,
        paymentMethod: salesTable.paymentMethod,
        amountPaid: salesTable.amountPaid,
        changeAmount: salesTable.changeAmount,
        status: salesTable.status,
        notes: salesTable.notes,
        createdBy: usersTable.fullName,
        createdAt: salesTable.createdAt,
      })
      .from(salesTable)
      .leftJoin(usersTable, eq(salesTable.createdById, usersTable.id))
      .where(eq(salesTable.id, id))
      .limit(1);

    if (!sale) { res.status(404).json({ error: "Sale not found" }); return; }

    const items = await db
      .select({
        id: saleItemsTable.id,
        saleId: saleItemsTable.saleId,
        productId: saleItemsTable.productId,
        productName: productsTable.name,
        productSku: productsTable.sku,
        quantity: saleItemsTable.quantity,
        unitPrice: saleItemsTable.unitPrice,
        discount: saleItemsTable.discount,
        gstRate: saleItemsTable.gstRate,
        gstAmount: saleItemsTable.gstAmount,
        totalPrice: saleItemsTable.totalPrice,
      })
      .from(saleItemsTable)
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(eq(saleItemsTable.saleId, id));

    res.json({
      sale: formatSale(sale),
      items: items.map((i) => ({
        id: i.id,
        saleId: i.saleId,
        productId: i.productId,
        productName: i.productName ?? "",
        productSku: i.productSku ?? "",
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        gstRate: Number(i.gstRate),
        gstAmount: Number(i.gstAmount),
        totalPrice: Number(i.totalPrice),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get sale error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/sales/:id/return */
router.post("/sales/:id/return", requireAuth, async (req, res) => {
  const saleId = parseInt(req.params.id);
  const parsed = ReturnSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" }); return;
  }

  try {
    const { itemIds, reason } = parsed.data;

    // Get sale items to return
    const items = await db
      .select()
      .from(saleItemsTable)
      .where(and(eq(saleItemsTable.saleId, saleId)))
      .then((all) => all.filter((i) => itemIds.includes(i.id)));

    for (const item of items) {
      const [product] = await db.select({ currentStock: productsTable.currentStock })
        .from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);

      const prevStock = product?.currentStock ?? 0;
      const newStock = prevStock + item.quantity;
      await db.update(productsTable).set({ currentStock: newStock }).where(eq(productsTable.id, item.productId));

      await db.insert(stockMovementsTable).values({
        productId: item.productId,
        movementType: "RETURN",
        quantity: item.quantity,
        previousStock: prevStock,
        newStock,
        reference: `RETURN-${saleId}`,
        notes: reason ?? "Sale return",
        createdById: req.user!.userId,
      });
    }

    const allItemIds = await db.select({ id: saleItemsTable.id }).from(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));
    const isFullReturn = itemIds.length === allItemIds.length;
    await db.update(salesTable).set({ status: isFullReturn ? "RETURNED" : "PARTIAL_RETURN" }).where(eq(salesTable.id, saleId));

    res.json({ message: "Return processed successfully" });
  } catch (err) {
    logger.error({ err }, "Return sale error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
