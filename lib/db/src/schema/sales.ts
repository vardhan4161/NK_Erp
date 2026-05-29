import { pgTable, serial, text, integer, numeric, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "CARD", "UPI", "CREDIT"]);
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "RETURNED", "PARTIAL_RETURN"]);

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerGstin: text("customer_gstin"),
  isInterState: boolean("is_inter_state").notNull().default(false),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  cgst: numeric("cgst", { precision: 12, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 12, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 12, scale: 2 }).notNull().default("0"),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
  changeAmount: numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: saleStatusEnum("status").notNull().default("COMPLETED"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
