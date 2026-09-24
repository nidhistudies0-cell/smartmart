# SmartMart — Normalization Walkthrough (UNF → 1NF → 2NF → 3NF)

This document shows how the SmartMart schema was reached by starting from one big unnormalized record and
removing redundancy step by step.

---

## 0. Starting point: Unnormalized Form (UNF)

Imagine the store tracked everything in a single sheet. One row describes one order and contains **lists of products**
in a single row.

**`STORE_RECORD`**

| Column | Example value |
|--------|---------------|
| order_id | 1 |
| order_date | 2026-09-01 |
| order_status | Delivered |
| total_amount | 669.00 |
| customer_id | 1 |
| customer_name | Asha Rao |
| customer_email | asha.rao@example.com |
| customer_phone | 9876543210 |
| customer_address | 123 MG Road, Bengaluru, KA |
| **products (repeating group)** | Basmati Rice 5kg, Coca-Cola Original Taste 1.5L |
| **prices** | 499.00, 85.00 |
| **quantities** | 1, 2 |
| **categories** | Staples & Groceries, Beverages |
| **suppliers** | FreshFarms India Pvt Ltd, Beverage Hub Distributors |
| **supplier contacts** | 9123456780, 9345678902 |
| **current_stock / reorder_level** | 80 / 20, 60 / 15 |
| payment_method | UPI |
| payment_status | Completed |
| payment_amount | 669.00 |

**Problems:** several values in one cell, so you can't search, sort, join or count products reliably; the number of
products per order is unbounded (how many columns would you add?).

---

## 1. First Normal Form (1NF)

**Rule:** every column holds a single, atomic value and there are no repeating groups.

**Fix:** put each product of an order on its own row. The key becomes the composite **(order_id, product_id)**.

**`STORE_RECORD` in 1NF**

| order_id | product_id | order_date | order_status | customer_id | customer_name | customer_email | … | product_name | price | category_name | supplier_name | supplier_contact | current_stock | reorder_level | quantity | payment_method | payment_status | payment_amount |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 2026-09-01 | Delivered | 1 | Asha Rao | asha.rao@example.com | … | Basmati Rice 5kg | 499.00 | Staples & Groceries | FreshFarms India Pvt Ltd | 9123456780 | 80 | 20 | 1 | UPI | Completed | 669.00 |
| 1 | 5 | 2026-09-01 | Delivered | 1 | Asha Rao | asha.rao@example.com | … | Coca-Cola Original Taste 1.5L | 85.00 | Beverages | Beverage Hub Distributors | 9345678902 | 60 | 15 | 2 | UPI | Completed | 669.00 |

**New problem:** massive redundancy. Asha's name, email and address are repeated on every line of every order;
the supplier's phone number is repeated for every product they supply. Changing a phone number means updating many rows.

---

## 2. Second Normal Form (2NF)

**Rule:** be in 1NF **and** have no *partial dependency*, meaning no non-key column may depend on only **part** of a
composite key.

With key **(order_id, product_id)** the functional dependencies are:

| Determinant | Determines | Type |
|-------------|------------|------|
| `order_id` | order_date, order_status, total_amount, customer_*, payment_* | **Partial** (only part of the key) |
| `product_id` | product_name, price, category_name, supplier_*, current_stock, reorder_level | **Partial** (only part of the key) |
| `(order_id, product_id)` | quantity, unit_price | Full dependency ✔ |

**Fix:** split by what each column really depends on.

| Relation | Key | Columns |
|----------|-----|---------|
| `ORDERS` | order_id | order_date, order_status, total_amount, customer_id, customer_name, customer_email, customer_phone, customer_address, payment_method, payment_status, payment_amount |
| `PRODUCT` | product_id | product_name, price, category_name, supplier_name, supplier_contact, current_stock, reorder_level |
| `ORDER_DETAILS` | (order_id, product_id) | quantity, unit_price |

`unit_price` is stored on the line because it is the price **at the time of sale** (it depends on both the order and
the product, and it must not change when the product's list price changes).

**Remaining problem:** inside `ORDERS` and `PRODUCT`, non-key columns still depend on other non-key columns.

---

## 3. Third Normal Form (3NF)

**Rule:** be in 2NF **and** have no *transitive dependency*, meaning no non-key column may depend on another non-key
column.

**Transitive dependencies found**

| Relation | Chain | Meaning |
|----------|-------|---------|
| `ORDERS` | order_id → **customer_id** → customer_name, email, phone, address | Customer details depend on the customer, not on the order |
| `PRODUCT` | product_id → **category_id** → category_name | Category name depends on the category |
| `PRODUCT` | product_id → **supplier_id** → supplier_name, contact, email, address | Supplier details depend on the supplier |

**Fix:** move each set of attributes into its own table and keep only the foreign key behind.

| New table | Key | Attributes |
|-----------|-----|------------|
| `CUSTOMER` | customer_id | name, email, password, phone, address, created_at |
| `CATEGORY` | category_id | category_name |
| `SUPPLIER` | supplier_id | supplier_name, contact_number, email, address |

**Modelling decisions beyond strict 3NF** (done for clarity and to match the business):

| Table | Reason it was separated |
|-------|-------------------------|
| `PAYMENT` | A payment has its own key, method, status and date. It is a 1-to-1 child of `ORDERS` (`UNIQUE order_id`). |
| `INVENTORY` | Stock changes far more often than product details and has its own `last_updated`. It is a 1-to-1 child of `PRODUCT` (`UNIQUE product_id`). |
| `ADMIN` | Records which staff member maintains categories, suppliers and products (nullable FK, `ON DELETE SET NULL`). |
| `CART` | Junction table for the many-to-many between customers and products (`UNIQUE (customer_id, product_id)`). |

---

## 4. Final 3NF schema (10 tables)

```
ADMIN         (admin_id PK, name, email UK, password, role, created_at)
CUSTOMER      (customer_id PK, name, email UK, password, phone, address, created_at)
CATEGORY      (category_id PK, category_name UK, admin_id FK)
SUPPLIER      (supplier_id PK, supplier_name, contact_number, email UK, address, admin_id FK)
PRODUCT       (product_id PK, product_name, description, price, expiry_date,
               category_id FK, supplier_id FK, admin_id FK, created_at)
INVENTORY     (inventory_id PK, product_id FK UK, current_stock, reorder_level, last_updated)
CART          (cart_id PK, customer_id FK, product_id FK, quantity, added_date,
               UNIQUE(customer_id, product_id))
ORDERS        (order_id PK, customer_id FK, order_date, order_status, total_amount)
ORDER_DETAILS (order_detail_id PK, order_id FK, product_id FK, quantity, unit_price)
PAYMENT       (payment_id PK, order_id FK UK, payment_method, payment_status, payment_date, amount)
```

See [`01_er_diagram.md`](./01_er_diagram.md) for the diagram and the foreign key delete rules.

---

## 5. Anomalies removed

| Anomaly | Before (single table) | After (3NF) |
|---------|-----------------------|-------------|
| **Update** | A supplier's phone number is stored on every product row; changing it means editing many rows and risking inconsistency. | Stored once in `supplier`. |
| **Insertion** | You can't record a new customer, product or supplier until an order exists for them. | Insert into `customer`, `product` or `supplier` independently. |
| **Deletion** | Deleting the only order for a product also deletes the product's price and supplier information. | Deleting an order removes only `orders` / `order_details` / `payment` rows. `product` and `supplier` are untouched (and `RESTRICT` blocks the reverse). |

---

## 6. Deliberate redundancy (be ready to explain in the viva)

| Column | Duplicates | Why it is kept |
|--------|-----------|----------------|
| `order_details.unit_price` | `product.price` | It is a **different fact**: the price when the order was placed. Old invoices must not change when a price changes. |
| `orders.total_amount` | `SUM(quantity × unit_price)` from `order_details` | Derived value stored for fast reporting and as the payable amount. The seed and purchase code always compute it from the line items so they stay consistent. |
| `payment.amount` | `orders.total_amount` | The amount actually charged or refunded is a payment fact and can in principle differ (partial refunds, fees). |

## 7. Boyce-Codd Normal Form (BCNF)

In this schema every determinant is a candidate key, meaning a primary key or a `UNIQUE` column (for example
`customer.email`, `category.category_name`, `inventory.product_id`, `payment.order_id`). The stored totals in section 6
are the only derived values. So the design also satisfies BCNF in practice, apart from that documented denormalization.