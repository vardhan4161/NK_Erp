# Volt ERP — Electronics Retail ERP & POS System

A full-stack desktop-class ERP and Point-of-Sale system for electronics retail stores. Covers billing/POS, inventory, products, categories, sales, expenses, reports, and user management with role-based access control.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/erp-pos run dev` — run the frontend (port auto-assigned)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter routing, TanStack Query, shadcn/ui, Recharts
- API: Express 5, JWT auth (jsonwebtoken), bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI 3.0 spec (source of truth for all API contracts)
- `lib/api-zod/src/generated/api.ts` — Zod schemas generated from OpenAPI spec
- `lib/api-client-react/src/generated/api.ts` — React Query hooks generated from OpenAPI spec
- `lib/db/src/schema/` — Drizzle ORM schema files (users, categories, products, stock_movements, sales, sale_items, expenses)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, categories, products, inventory, sales, expenses, reports)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT sign/verify/requireAuth/requireRole middleware
- `artifacts/erp-pos/src/pages/` — React page components (login, dashboard, pos, products, inventory, categories, sales, expenses, reports, users, settings)

## Architecture decisions

- Contract-first API: OpenAPI spec → Zod schemas (backend validation) + React Query hooks (frontend)
- JWT stored in `localStorage` under key `erp_token`; injected in `custom-fetch.ts` for every API call
- `bcryptjs` (pure JS, no native build) used for password hashing — avoids native addon build issues in Replit
- GST split: intra-state → CGST + SGST (half each); inter-state → IGST (full)
- Stock managed via `stock_movements` table for full audit trail; product `current_stock` updated atomically
- Soft delete for products (`is_active = false`); users deactivated rather than deleted

## Product

- **Login**: Role-based access (admin / manager / cashier) with JWT authentication
- **Dashboard**: Today's revenue, monthly revenue, profit/loss, product count, charts
- **POS Terminal**: Cart-based billing with GST calculation, payment methods, change calculation
- **Products**: Full CRUD, SKU auto-generation, barcode support, cost/selling price, GST rate
- **Inventory**: Stock movement log (Purchase / Adjustment / Return), low stock alerts
- **Categories**: Product category management with product counts
- **Sales**: Full sales history with invoice details and return processing
- **Expenses**: Expense tracking by category with date filtering
- **Reports**: Profit & Loss, GST summary, category-wise sales breakdown
- **Users**: Admin-only user management with role assignment and password change
- **Settings**: Personal profile and password change

## Demo credentials

| Role    | Username   | Password   |
|---------|-----------|------------|
| Admin   | admin     | admin123   |
| Manager | manager1  | admin123   |
| Cashier | cashier1  | admin123   |

## User preferences

- No emojis in code or UI unless explicitly requested
- Dark/slate professional color scheme for the ERP dashboard

## Gotchas

- After any codegen run (`pnpm --filter @workspace/api-spec run codegen`), `lib/api-zod/src/index.ts` must only contain `export * from "./generated/api";` — fix any stale exports manually
- Use `bcryptjs` not `bcrypt` — native bcrypt build scripts are blocked in Replit sandbox
- Never call service ports directly; always use `localhost:80/<path>` through the shared proxy
- Run `pnpm --filter @workspace/db run push` after any schema changes before seeding

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
