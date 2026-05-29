CREATE TYPE "public"."role" AS ENUM('admin', 'manager', 'cashier');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'UPI', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('COMPLETED', 'RETURNED', 'PARTIAL_RETURN');--> statement-breakpoint
CREATE TYPE "public"."serial_status" AS ENUM('AVAILABLE', 'SOLD', 'DEFECTIVE');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"gstin" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" text NOT NULL,
	"reference" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'cashier' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"barcode" text,
	"name" text NOT NULL,
	"description" text,
	"category_id" integer NOT NULL,
	"brand" text,
	"model" text,
	"cost_price" numeric(12, 2) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"gst_rate" numeric(5, 2) DEFAULT '18' NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 5 NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"reference" text,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"customer_gstin" text,
	"is_inter_state" boolean DEFAULT false NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cgst" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sgst" numeric(12, 2) DEFAULT '0' NOT NULL,
	"igst" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"change_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "sale_status" DEFAULT 'COMPLETED' NOT NULL,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"gst_amount" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serial_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"serial_number" text NOT NULL,
	"imei1" text,
	"imei2" text,
	"status" serial_status DEFAULT 'AVAILABLE' NOT NULL,
	"sale_id" integer,
	"purchase_price" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "serial_numbers_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;