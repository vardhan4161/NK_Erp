import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { salesTable } from "./sales";

export const serialStatusEnum = pgEnum("serial_status", ["AVAILABLE", "SOLD", "DEFECTIVE"]);

export const serialNumbersTable = pgTable("serial_numbers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  serialNumber: text("serial_number").notNull().unique(),
  imei1: text("imei1"),
  imei2: text("imei2"),
  status: serialStatusEnum("status").notNull().default("AVAILABLE"),
  saleId: integer("sale_id").references(() => salesTable.id),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSerialNumberSchema = createInsertSchema(serialNumbersTable).omit({ id: true, createdAt: true });
export type InsertSerialNumber = z.infer<typeof insertSerialNumberSchema>;
export type SerialNumber = typeof serialNumbersTable.$inferSelect;
