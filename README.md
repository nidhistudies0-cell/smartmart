# SmartMart: Inventory & Online Supermarket DBMS

A relational database for a supermarket: products, categories, suppliers, stock levels, customers, carts, orders,
order lines and payments. Built on **PostgreSQL (hosted on Neon)** with **Drizzle ORM** and **TypeScript**.

- **10 tables + 3 views**, normalized to 3NF
- Integrity enforced with primary keys, foreign keys (`CASCADE` / `RESTRICT` / `SET NULL`), unique constraints and enums
- Demo dataset of roughly 66 products, 34 customers, 94 orders and 277 order lines
- SQL scripts, TypeScript data-management scripts, and a small Express API

---

## Contents

1. [Quick start](#1-quick-start)
2. [Project structure](#2-project-structure)
3. [What each file is for](#3-what-each-file-is-for)
4. [Which files should I use?](#4-which-files-should-i-use)
5. [Command cheat sheet](#5-command-cheat-sheet)
6. [How to run the demo](#6-how-to-run-the-demo)
7. [Data model summary](#7-data-model-summary)
8. [Team workflow and warnings](#8-team-workflow-and-warnings)
9. [Troubleshooting](#9-troubleshooting)
10. [Known limitations](#10-known-limitations)

---

## 1. Quick start

```bash
git clone <your-repo-url>
cd smartmart
npm install
```

**Connect to Neon**

1. Create a project at [neon.tech](https://neon.tech), or ask a teammate to add you to the shared one.
2. Copy the **connection string** from the Neon dashboard.
3. Create a `.env` file in the project root:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require
   ```
   Never commit `.env` (it is listed in `.gitignore`). Share the URL with teammates privately.

**Create the tables** (only needed once, or after `schema.ts` changes; the shared database already has them):

```bash
npx drizzle-kit push
```

**Load the demo data** (this deletes all existing rows first, see [warnings](#8-team-workflow-and-warnings)):

```bash
npm run seed
```

**Look at the data:**

```bash
npx drizzle-kit studio      # opens https://local.drizzle.studio
```

You may see `npm warn` messages or "moderate severity vulnerabilities" during install. They come from esbuild's normal
install process and are safe to ignore for this project.

---

## 2. Project structure

```
smartmart/
├── schema.ts                    # Source of truth: all 10 tables, enums, relations
├── db.ts                        # Reusable Neon + Drizzle client
├── drizzle.config.ts            # Tells drizzle-kit how to connect
├── seed.ts                      # ONE COMMAND: reset DB, load full dataset, short demo
├── server.ts                    # Express API (GET /api/products)
├── run-advanced.ts              # Runs advanced_queries.sql (creates the 3 views)
├── .env                         # Your DATABASE_URL (not committed)
├── package.json
│
├── data-management/             # TypeScript data-management layer
│   ├── seedData.ts              # Wipes tables + loads the small base dataset (calls seedBulk)
│   ├── seedBulk.ts              # Adds bulk data: products, customers, ~90 orders over 6 months
│   ├── crudOperations.ts        # CRUD functions incl. foreign-key RESTRICT demo
│   ├── inventoryOperations.ts   # Stock display, restock, purchase simulation, low-stock alerts
│   └── index.ts                 # Full demo runner (npm run data-management)
│
└── database/                    # Raw SQL + documentation
    ├── README.md                # Guide to this folder
    ├── 01_er_diagram.md         # Mermaid ER diagram, relationships, delete rules
    ├── 02_normalization.md      # UNF -> 1NF -> 2NF -> 3NF walkthrough
    ├── 03_data_population.sql   # Base dataset in raw SQL (small)
    ├── 04_crud_operations.sql   # INSERT / SELECT / UPDATE / DELETE examples
    ├── 05_inventory_operations.sql  # Stock, transactional purchase, low-stock report
    ├── advanced_queries.sql     # 24 advanced queries + 3 views
    └── demo_queries.sql         # Queries in presentation order, with talking points
```

---

## 3. What each file is for

### Core (nothing works without these)

| File | Relevance |
|------|-----------|
| `schema.ts` | Defines every table, column, key, constraint and enum. This **is** the database design in code. `drizzle-kit push` turns it into real tables. |
| `db.ts` | Creates the database connection used by all TypeScript files. |
| `drizzle.config.ts` | Configuration for `drizzle-kit push` and `drizzle-kit studio`. |
| `.env` | Holds `DATABASE_URL`. Every script reads it. |
| `package.json` | Dependencies and the `push`, `studio`, `seed` and `data-management` scripts. |

### SQL deliverables (the database work itself)

| File | Relevance |
|------|-----------|
| `database/03_data_population.sql` | Loads the **small base dataset** (10 products, 4 customers, 4 orders) using plain SQL. |
| `database/04_crud_operations.sql` | Create / Read / Update / Delete examples, plus a join, an aggregate, a subquery and a foreign-key restriction demo. |
| `database/05_inventory_operations.sql` | Stock display, restocking, a **transactional purchase** (`BEGIN ... COMMIT`) that deducts stock, negative-stock protection, and the low-stock report. |
| `database/advanced_queries.sql` | 24 advanced queries: joins, aggregates, `GROUP BY` / `HAVING`, nested queries, reports and **3 views**. |
| `database/demo_queries.sql` | The best queries from the files above, in presentation order, with "SAY:" talking points and "EXPECT:" results. **Use this for the live demo.** |

### TypeScript data layer (automates and exercises the same database from code)

| File | Relevance |
|------|-----------|
| `seed.ts` | The one-command loader. Wipes the database, loads base + bulk data, and prints a short READ / UPDATE / aggregate / low-stock demo. |
| `data-management/seedData.ts` | Clears all tables (`clearAllData`) and inserts the small base dataset, then calls the bulk loader. |
| `data-management/seedBulk.ts` | Generates the larger dataset: 10 categories, 10 suppliers, about 55 more products, about 30 more customers, about 90 orders spread over 6 months with matching line items and payments. Deterministic, so everyone gets the same shape of data. |
| `data-management/crudOperations.ts` | CRUD implemented through Drizzle, including the foreign-key `RESTRICT` demonstration. |
| `data-management/inventoryOperations.ts` | Stock display, restock, `simulatePurchase()` with automatic stock deduction and negative-stock prevention, `checkLowStock()`. |
| `data-management/index.ts` | Runs everything above in sequence as a scripted demo. |
| `run-advanced.ts` | Executes every statement in `advanced_queries.sql` (this is what creates the views). It only prints "Running query N", not the results. |

### Application and documentation

| File | Relevance |
|------|-----------|
| `server.ts` | Small Express backend. `GET /api/products` returns products joined with category and supplier as JSON. Shows the database powering an app. |
| `database/01_er_diagram.md` | ER diagram (Mermaid), cardinalities and `ON DELETE` rules. For the report and viva. |
| `database/02_normalization.md` | Normalization steps with functional dependencies and anomalies. For the report and viva. |
| `database/README.md` | Short guide to the `database/` folder. |

---

## 4. Which files should I use?

The project has **two parallel ways** to work with the same database:

- **SQL path:** the numbered `.sql` files. This shows the queries themselves and works in any Postgres client.
- **TypeScript path:** the scripts in `data-management/` plus `seed.ts`. This automates loading and shows how an
  application talks to the database.

| I want to... | Use this |
|--------------|----------|
| Set up the tables | `npx drizzle-kit push` |
| Get a full, realistic dataset quickly | `npm run seed` |
| Browse or edit data visually | `npx drizzle-kit studio` |
| Present the queries live | `database/demo_queries.sql` in the Neon **SQL Editor** |
| Show all 24 advanced queries and recreate the views | `npx tsx run-advanced.ts`, or paste `advanced_queries.sql` into the SQL Editor |
| Show CRUD, purchases, stock deduction and FK protection running from code | `npm run data-management` |
| Show the raw SQL versions of CRUD and inventory | `database/04_crud_operations.sql` and `05_inventory_operations.sql` |
| Explain the design | `database/01_er_diagram.md` and `02_normalization.md` |
| Show a backend using the database | `npx tsx server.ts`, then open `http://localhost:5000/api/products` |

### Important: the two data paths are not the same size

| Path | Data it loads |
|------|---------------|
| `03_data_population.sql` (SQL) | **Small base set:** 10 products, 4 customers, 4 orders |
| `npm run seed` / `npm run data-management` (TypeScript) | **Full set:** about 66 products, 34 customers, 94 orders |

For the demo, always load data with **`npm run seed`**. Use `03_data_population.sql` only on an **empty** database.
Running it on top of existing data creates duplicate products and orders, because most of its inserts are not
protected by `ON CONFLICT`.

`04_crud_operations.sql` and `05_inventory_operations.sql` modify data (a price change, deleted cart item, and a new
purchase that reduces stock). They are fine to run, but re-running `05` adds another order each time.

---

## 5. Command cheat sheet

| Goal | Command | Changes data? |
|------|---------|---------------|
| Install dependencies | `npm install` | No |
| Create or sync tables from `schema.ts` | `npx drizzle-kit push` | Schema only |
| Open Drizzle Studio | `npx drizzle-kit studio` | Only if you edit in the UI |
| **Reset DB and load full dataset + short demo** | `npm run seed` | **Deletes all rows first** |
| **Full scripted data-management demo** | `npm run data-management` | **Deletes all rows first** |
| Run all advanced queries / create views | `npx tsx run-advanced.ts` | Creates/replaces 3 views |
| Start the Express API | `npx tsx server.ts` | No |

Optional: add these to `package.json` `"scripts"` for convenience:

```json
"advanced": "tsx run-advanced.ts",
"server": "tsx server.ts"
```

---

## 6. How to run the demo

### Before the session (10 minutes)

1. Tell your teammates you are about to reset the shared database.
2. Run `npm run seed`. It should finish with a table of row counts (roughly: admin 2, customer 34, category 10,
   supplier 10, product 66, inventory 66, cart 19, orders 94, order_details 277, payment 94).
3. Confirm the three views exist (`product_inventory_view`, `customer_order_history_view`,
   `product_sales_report_view`). If not, run `npx tsx run-advanced.ts`.
4. Open these tabs and windows:
   - Drizzle Studio (`npx drizzle-kit studio`)
   - Neon dashboard -> **SQL Editor**, with `database/demo_queries.sql` open beside it
   - `database/01_er_diagram.md` in Markdown preview (or paste the diagram into [mermaid.live](https://mermaid.live))
   - A terminal in the project folder
5. Run `npm run data-management` once in advance so you know how long it takes and what it prints, then run
   `npm run seed` again to restore the full dataset. (Both commands reset the data.)
6. Try every query in `demo_queries.sql` once so there are no surprises.

### Suggested flow (10 to 15 minutes)

| Time | Show | Say |
|------|------|-----|
| 1 min | This README's overview | Inventory and online-supermarket DBMS: 10 tables, 3 views, PostgreSQL on Neon with Drizzle ORM. |
| 2 min | `01_er_diagram.md` | Two 1-to-1 links (product-inventory, order-payment); `order_details` is the junction table for the many-to-many between orders and products. |
| 2 min | `02_normalization.md` | A list of products in one cell becomes one row each in `order_details` (1NF); customer, category and supplier details move to their own tables (2NF/3NF). |
| 2 min | Drizzle Studio | Row counts, open `order_details` and follow a foreign key to `orders` and `product`, open a view. |
| 3 min | SQL Editor with `demo_queries.sql` | Sections 2 to 7: joins, aggregates, `HAVING`, nested queries, views, reports. Run **one statement at a time**. |
| 1 min | `demo_queries.sql` sections 8 and 10 | Low-stock reorder list, the negative-stock guard, and the consistency checks that return zero rows. |
| 1 min | `demo_queries.sql` section 9 | Integrity failing on purpose: bad foreign key, bad enum, duplicate email, second payment, deleting a product with orders. |
| 3 min | Terminal: `npm run data-management` | Pause on the foreign-key `RESTRICT` error, the successful purchase with stock deduction, and "PURCHASE ABORTED: insufficient stock". Then refresh Studio to see the new order and reduced stock. |
| 1 min | `npx tsx server.ts` -> `http://localhost:5000/api/products` | The backend serves joined product data as JSON. |
| 1 min | Limitations (section 10) | Name them yourself before you are asked. |

### Likely viva questions

| Question | Short answer |
|----------|--------------|
| Why is `order_details` the biggest table? | One row per product on each order (about 3 per order). |
| Why does `unit_price` duplicate `product.price`? | It is the price at the time of sale, so old invoices do not change when prices change. |
| What stops deleting a product that has orders? | `ON DELETE RESTRICT` on `order_details.product_id`. |
| How is negative stock prevented? | A stock check in the app, and a guarded `UPDATE ... WHERE current_stock >= n` in SQL. A `CHECK` constraint would be the proper database-level fix (see limitations). |
| How are 1-to-1 relationships implemented? | A `UNIQUE` constraint on the foreign key (`inventory.product_id`, `payment.order_id`). |
| What is a view? | A saved query that always reflects current data; we have three. |

### Demo gotchas

- **Highlight one statement at a time** in the SQL Editor. Running everything shows only the last result.
- **`run-advanced.ts` does not display results.** Use the SQL Editor for showing query output.
- **Port 5000 on macOS** is often taken by AirPlay Receiver. If `server.ts` fails or the browser shows a 403,
  change `PORT` in `server.ts` to `5001`.
- **`npm run seed` and `npm run data-management` reset the data.** Never run them while teammates are editing.

---

## 7. Data model summary

| Table | Purpose |
|-------|---------|
| `admin` | Staff who maintain the catalogue |
| `customer` | Registered shoppers |
| `category` | Product groupings |
| `supplier` | Vendors |
| `product` | Items for sale (belongs to one category and one supplier) |
| `inventory` | Stock level and reorder threshold, **1-to-1** with product |
| `cart` | Customer-to-product junction (one row per customer/product) |
| `orders` | One row per order |
| `order_details` | Order-to-product junction: quantity and price at time of sale |
| `payment` | **1-to-1** with orders |

Views: `product_inventory_view` (stock status), `customer_order_history_view` (orders per customer),
`product_sales_report_view` (units and revenue per product).

Delete rules: `RESTRICT` protects history (products on orders, customers with orders, categories/suppliers with
products); `CASCADE` removes dependent rows (inventory, cart items, order lines, payment); `SET NULL` keeps records when
an admin is removed. Full diagram and tables: [`database/01_er_diagram.md`](./database/01_er_diagram.md).

---

## 8. Team workflow and warnings

- Everyone points at the **same** Neon `DATABASE_URL`, so data added in Drizzle Studio is visible to everyone.
  Share the URL privately; never commit it.
- `npm run seed` and `npm run data-management` **delete every row** in every table before loading data. Tell the team
  first.
- Run `npx drizzle-kit push` only after the team agrees on a schema change, because it alters the shared database.
- `03_data_population.sql` is for an empty database only (see section 4).
- Sample passwords are placeholders, not real hashes.

---

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` is undefined or the connection fails | Check that `.env` exists in the project root with the full Neon connection string (including `?sslmode=require`). |
| `Cannot find module` errors | Run `npm install`. |
| Drizzle Studio says "Failed to extract relations ... Invalid relation" | In `schema.ts`, every `many()` relation needs a matching `one()` on the other table, and vice versa. Fix it, then restart Studio. |
| Unique-constraint error when seeding | You ran an old script that inserts fixed rows. Use `npm run seed`, which clears the tables first. |
| Views missing in Studio or SQL Editor | Run `npx tsx run-advanced.ts` to recreate them. |
| Studio still shows old counts after seeding | Click the refresh icon next to the search box. If counts are still old, check the terminal for a seed error. |
| `server.ts` will not start on port 5000 | Change `PORT` to `5001` (macOS AirPlay often uses 5000). |
| Duplicate products after running `03_data_population.sql` | It was run on a non-empty database. Re-run `npm run seed` to reset. |

---

## 10. Known limitations

- **No `CHECK` constraints yet** (for example `current_stock >= 0`, `quantity > 0`, `price >= 0`). Negative-stock
  protection currently lives in the application and SQL logic, not in the table definition.
- **`simulatePurchase()` in TypeScript is not atomic.** The `neon-http` driver does not support transactions, so
  stock deduction, order, line items and payment run as separate steps. The raw SQL version in
  `05_inventory_operations.sql` is fully transactional.
- **The stock check in TypeScript is read-then-write**, so simultaneous purchases could both pass it. The guarded SQL
  `UPDATE` is safe because the check and the change are one statement.
- **Seeded historical orders do not deduct stock.** Inventory levels are independent of the generated order history.
- **Only primary and unique keys are indexed.** Adding indexes on `orders.customer_id` and `order_details.product_id`
  and comparing with `EXPLAIN ANALYZE` is a natural next step.
- **Derived values are stored** (`orders.total_amount`, `payment.amount`) as deliberate denormalization; they are
  consistent with the line items in the seeded data.