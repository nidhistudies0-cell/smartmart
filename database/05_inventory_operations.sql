-- ==============================================================================
-- SMARTMART DBMS: 05_INVENTORY_OPERATIONS.SQL
-- Inventory Management, Stock Reduction, & Low-Stock Alerts (Raw PostgreSQL)
-- Audited strictly against schema.ts
-- ==============================================================================

-- ==============================================================================
-- 1. DISPLAY CURRENT STOCK STATUS
-- ==============================================================================
SELECT 
    i.inventory_id,
    p.product_id,
    p.product_name,
    p.price,
    i.current_stock,
    i.reorder_level,
    CASE 
        WHEN i.current_stock <= i.reorder_level THEN '⚠️ LOW STOCK'
        ELSE '✅ OK'
    END AS stock_status,
    i.last_updated
FROM inventory i
INNER JOIN product p ON i.product_id = p.product_id
ORDER BY i.product_id;


-- ==============================================================================
-- 2. RESTOCK / MANUAL STOCK UPDATE
-- ==============================================================================

-- 2.1 Set absolute stock quantity for a specific product dynamically
UPDATE inventory
SET current_stock = 100,
    last_updated = CURRENT_TIMESTAMP
WHERE product_id = (SELECT product_id FROM product WHERE product_name = 'Amul Taaza Toned Milk 1L' LIMIT 1);

-- 2.2 Add additional stock (Restocking batch addition)
UPDATE inventory
SET current_stock = current_stock + 25,
    last_updated = CURRENT_TIMESTAMP
WHERE product_id = (SELECT product_id FROM product WHERE product_name = 'Aashirvaad Whole Wheat Atta 5kg' LIMIT 1);


-- ==============================================================================
-- 3. SIMULATE PURCHASE & AUTOMATIC STOCK REDUCTION (TRANSACTIONAL CTE)
-- ==============================================================================

-- Transaction simulating Customer 'Asha Rao' purchasing 2 units of 'Basmati Rice 5kg'
-- and paying via UPI.
BEGIN;

-- Step 3.1: Deduct stock from Inventory (Guarded against negative stock: current_stock >= 2)
UPDATE inventory
SET current_stock = current_stock - 2,
    last_updated = CURRENT_TIMESTAMP
WHERE product_id = (SELECT product_id FROM product WHERE product_name = 'Basmati Rice 5kg' LIMIT 1)
  AND current_stock >= 2;

-- Step 3.2: Insert Order, Order Detail line item, and Payment atomically via CTEs
WITH new_order AS (
    INSERT INTO orders (customer_id, order_date, order_status, total_amount)
    SELECT customer_id, CURRENT_TIMESTAMP, 'Confirmed'::order_status, 998.00
    FROM customer WHERE email = 'asha.rao@example.com'
    RETURNING order_id
),
new_order_detail AS (
    INSERT INTO order_details (order_id, product_id, quantity, unit_price)
    SELECT no.order_id, p.product_id, 2, 499.00
    FROM new_order no, product p
    WHERE p.product_name = 'Basmati Rice 5kg'
    RETURNING order_id
)
INSERT INTO payment (order_id, payment_method, payment_status, payment_date, amount)
SELECT no.order_id, 'UPI'::payment_method, 'Completed'::payment_status, CURRENT_TIMESTAMP, 998.00
FROM new_order no;

COMMIT;


-- ==============================================================================
-- 4. PREVENT NEGATIVE STOCK DEMONSTRATION
-- ==============================================================================

-- Method A: SQL Conditional Update Guard
-- Attempting to purchase 999 units of Instant Coffee when current_stock is 2.
-- Returns "UPDATE 0" because current_stock < 999 condition fails.
UPDATE inventory
SET current_stock = current_stock - 999,
    last_updated = CURRENT_TIMESTAMP
WHERE product_id = (SELECT product_id FROM product WHERE product_name = 'Nescafe Classic Instant Coffee 100g' LIMIT 1)
  AND current_stock >= 999;
-- Result: UPDATE 0 (Negative stock prevented safely at SQL query layer)

-- Method B: Database Level Check Constraint (Reference for Viva Explanation)
-- ALTER TABLE inventory ADD CONSTRAINT chk_negative_stock CHECK (current_stock >= 0);


-- ==============================================================================
-- 5. LOW-STOCK DETECTION & ALERTS (reorder threshold detection)
-- Finds products where current_stock <= reorder_level
-- ==============================================================================
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    s.supplier_name,
    i.current_stock,
    i.reorder_level,
    (i.reorder_level - i.current_stock) AS shortfall_units
FROM inventory i
INNER JOIN product p ON i.product_id = p.product_id
INNER JOIN category c ON p.category_id = c.category_id
INNER JOIN supplier s ON p.supplier_id = s.supplier_id
WHERE i.current_stock <= i.reorder_level
ORDER BY shortfall_units DESC;
