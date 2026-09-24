# SmartMart — Database Documentation

SmartMart is an inventory-management and online-supermarket database built on **PostgreSQL (Neon)** with
**Drizzle ORM**. The schema has **10 tables and 3 views**, is normalized to 3NF, and enforces integrity with primary
keys, foreign keys, unique constraints and enums.

## Contents of this folder

| File | What it contains |
|------|------------------|
| [`01_er_diagram.md`](./01_er_diagram.md) | Mermaid ER diagram, entity list, relationships, cardinality and `ON DELETE` rules |
| [`02_normalization.md`](./02_normalization.md) | UNF → 1NF → 2NF → 3NF walkthrough with functional dependencies and anomalies |
| [`03_data_population.sql`](./03_data_population.sql) | Base dataset in raw SQL (admins, customers, products, orders, payments, …) |
| [`04_crud_operations.sql`](./04_crud_operations.sql) | INSERT / SELECT / UPDATE / DELETE examples, joins, aggregate, subquery, FK `RESTRICT` demo |
| [`05_inventory_operations.sql`](./05_inventory_operations.sql) | Stock display, restock, transactional purchase with stock deduction, negative-stock guard, low-stock alerts |
| [`advanced_queries.sql`](./advanced_queries.sql) | 24 advanced queries: joins, aggregates, `GROUP BY`/`HAVING`, nested queries, 3 views, reports |

The schema itself is defined in [`../schema.ts`](../schema.ts) (source of truth) and created with
`npx drizzle-kit push`.

## Dataset

After `npm run seed`, the database holds roughly:

| Table | Rows | Table | Rows |
|-------|------|-------|------|
| admin | 2 | inventory | 66 |
| customer | 34 | cart | 19 |
| category | 10 | orders | 94 |
| supplier | 10 | order_details | 277 |
| product | 66 | payment | 94 |

Orders are spread across the last six months with a realistic mix of statuses (Delivered, Shipped, Confirmed,
Pending, Cancelled). Order totals always equal the sum of their line items, and payment status follows order status.
About 20% of products are deliberately at or below their reorder level so the low-stock reports have results, and a
few customers have never ordered.

## How to run

| Goal | Command |
|------|---------|
| Create or sync tables from `schema.ts` | `npx drizzle-kit push` |
| Reset the DB and load the full dataset, then run a short demo | `npm run seed` |
| Full data-management demo (CRUD, inventory, purchase, FK protection) | `npm run data-management` |
| Create the views and run all 24 advanced queries | `npx tsx run-advanced.ts` |
| Browse and edit data visually | `npx drizzle-kit studio` (opens `https://local.drizzle.studio`) |
| Run the raw SQL files | Paste them into the Neon **SQL Editor**, or run with `psql "$DATABASE_URL" -f <file>` |

> ⚠️ `npm run seed` and `npm run data-management` **delete all rows** in every table before loading data.
> Everyone on the team shares one Neon database, so tell the team before running them.

For the raw SQL files, run them in numeric order: `03_data_population.sql`, then `04_crud_operations.sql`, then
`05_inventory_operations.sql`, then `advanced_queries.sql`. The population script has the destructive `TRUNCATE`
commented out, and the inserts use `ON CONFLICT DO NOTHING` where a unique key exists.

## What demonstrates what

| Concept | Where to show it |
|---------|------------------|
| ER design and cardinality | `01_er_diagram.md` |
| Normalization (1NF → 3NF) | `02_normalization.md` (`order_details` is the clearest 1NF example) |
| Entity, referential and domain integrity | `schema.ts`; `04_crud_operations.sql` section 4.3 |
| FK `RESTRICT` blocking a delete | `demonstrateRestrictedProductDelete()` in `data-management/crudOperations.ts` |
| CRUD | `04_crud_operations.sql`; `data-management/crudOperations.ts` |
| Joins, aggregates, `HAVING`, nested queries | `advanced_queries.sql` queries 1–18 |
| Views | `advanced_queries.sql` queries 19–21 |
| Transactions and stock deduction | `05_inventory_operations.sql` section 3 (`BEGIN … COMMIT`) |
| Negative-stock prevention | `05_inventory_operations.sql` section 4; `simulatePurchase()` |
| Low-stock alerts | `05_inventory_operations.sql` section 5; `checkLowStock()` |

## Integrity summary

- **Entity integrity:** every table has a `serial` primary key; key columns are `NOT NULL`.
- **Referential integrity:** foreign keys with deliberate delete rules. `RESTRICT` protects history (products on
  invoices, customers with orders, categories/suppliers with products), `CASCADE` removes dependent rows
  (inventory, cart items, order details, payment), and `SET NULL` keeps records when an admin is removed.
- **Domain integrity:** typed and length-limited columns, plus enums for `order_status`, `payment_method` and
  `payment_status`.
- **Uniqueness:** emails, category name, one cart row per customer/product, one inventory row per product, one payment
  per order.

## Known limitations and possible improvements

- No `CHECK` constraints yet (for example `current_stock >= 0`, `quantity > 0`, `price >= 0`). Negative-stock
  protection currently lives in the application and SQL logic.
- The TypeScript `simulatePurchase()` runs its steps separately because the `neon-http` driver does not support
  transactions. The raw SQL version in `05_inventory_operations.sql` is fully transactional.
- Passwords in the sample data are placeholders, not real hashes.
- Indexes beyond the primary and unique keys (for example on `orders.customer_id` and `order_details.product_id`)
  could be added and compared using `EXPLAIN ANALYZE` now that the dataset is larger.