-- ==============================================================================
-- SMARTMART DBMS: 04_CRUD_OPERATIONS.SQL
-- CRUD Operations & Relational Queries (Raw PostgreSQL)
-- Audited strictly against schema.ts
-- ==============================================================================

-- ==============================================================================
-- 1. CREATE / INSERT OPERATIONS
-- ==============================================================================

-- 1.1 Insert a new Category
INSERT INTO category (category_name, admin_id)
SELECT 'Organic Foods', admin_id 
FROM admin WHERE email = 'admin@smartmart.com' LIMIT 1
ON CONFLICT (category_name) DO NOTHING;

-- 1.2 Insert a new Supplier
INSERT INTO supplier (supplier_name, contact_number, email, address, admin_id)
SELECT 'Tata Consumer Products Ltd', '9898989898', 'support@tataconsumer.com', 'Tower A, Mumbai, MH', admin_id
FROM admin WHERE email = 'admin@smartmart.com' LIMIT 1
ON CONFLICT (email) DO NOTHING;

-- 1.3 Insert a new Product and initialize Inventory using a CTE (No assumed IDs!)
WITH new_prod AS (
    INSERT INTO product (product_name, description, price, expiry_date, category_id, supplier_id, admin_id)
    SELECT 
        'Tata Salt Vacuum Evaporated 1kg', 
        'Iodised vacuum evaporated salt', 
        28.00, 
        '2028-12-31'::date, 
        c.category_id, 
        s.supplier_id, 
        a.admin_id
    FROM category c, supplier s, admin a
    WHERE c.category_name = 'Staples & Groceries'
      AND s.email = 'contact@freshfarms.in'
      AND a.email = 'admin@smartmart.com'
    LIMIT 1
    RETURNING product_id
)
INSERT INTO inventory (product_id, current_stock, reorder_level)
SELECT product_id, 200, 50 FROM new_prod
ON CONFLICT (product_id) DO NOTHING;

-- 1.4 Register a new Customer
INSERT INTO customer (name, email, password, phone, address)
VALUES ('Ananya Sharma', 'ananya.sharma@example.com', 'ananya_pass_123', '9811223344', '88 Jubilee Hills, Hyderabad, TS')
ON CONFLICT (email) DO NOTHING;


-- ==============================================================================
-- 2. READ / SELECT OPERATIONS (Simple, Joined, Aggregated, Subqueries)
-- ==============================================================================

-- 2.1 Basic SELECT: Retrieve all customer records
SELECT customer_id, name, email, phone, address, created_at 
FROM customer;

-- 2.2 Relational JOIN: Retrieve Product details with Category, Supplier, and Inventory Stock
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    c.category_name,
    s.supplier_name,
    i.current_stock,
    i.reorder_level
FROM product p
INNER JOIN category c ON p.category_id = c.category_id
INNER JOIN supplier s ON p.supplier_id = s.supplier_id
LEFT JOIN inventory i ON p.product_id = i.product_id
ORDER BY p.product_id;

-- 2.3 Filtered SELECT: Find all products in 'Dairy & Bakery' category
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    c.category_name
FROM product p
INNER JOIN category c ON p.category_id = c.category_id
WHERE c.category_name = 'Dairy & Bakery';

-- 2.4 Aggregate Query: Calculate total sales revenue grouped by Payment Status
SELECT 
    payment_status,
    COUNT(payment_id) AS total_transactions,
    SUM(amount) AS total_revenue
FROM payment
GROUP BY payment_status;

-- 2.5 Nested Subquery: Find customers whose order totals exceed the average order amount
SELECT 
    c.customer_id,
    c.name,
    c.email,
    o.order_id,
    o.total_amount
FROM customer c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.total_amount > (SELECT AVG(total_amount) FROM orders);


-- ==============================================================================
-- 3. UPDATE OPERATIONS
-- ==============================================================================

-- 3.1 Update Product Price dynamically by product name
UPDATE product
SET price = 520.00
WHERE product_name = 'Basmati Rice 5kg';

-- 3.2 Update Customer Address dynamically by customer email
UPDATE customer
SET address = '99 Sector 15, Gurgaon, HR'
WHERE email = 'rahul.sharma@example.com';

-- 3.3 Update Order Status dynamically by customer email and status
UPDATE orders
SET order_status = 'Confirmed'::order_status
WHERE customer_id = (SELECT customer_id FROM customer WHERE email = 'priya.patel@example.com' LIMIT 1)
  AND order_status = 'Pending'::order_status;


-- ==============================================================================
-- 4. DELETE OPERATIONS & REFERENTIAL INTEGRITY DEMONSTRATIONS
-- ==============================================================================

-- 4.1 Safe Delete: Remove a specific item from a Customer's Shopping Cart
DELETE FROM cart
WHERE customer_id = (SELECT customer_id FROM customer WHERE email = 'asha.rao@example.com' LIMIT 1)
  AND product_id = (SELECT product_id FROM product WHERE product_name = 'Basmati Rice 5kg' LIMIT 1);

-- 4.2 Safe Delete: Remove a newly registered customer who has placed NO orders
DELETE FROM customer
WHERE email = 'ananya.sharma@example.com'
  AND customer_id NOT IN (SELECT DISTINCT customer_id FROM orders);

-- 4.3 FK RESTRICT Constraint Demonstration:
-- Attempting to delete a Product that exists in order_details will trigger a DB Exception.
-- Reason: ON DELETE RESTRICT prevents deleting products tied to historical order invoices.
-- Run the query below to demonstrate Foreign Key protection during Viva:
-- DELETE FROM product WHERE product_name = 'Basmati Rice 5kg';
