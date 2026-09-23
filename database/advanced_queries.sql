-- =====================================================
-- MEMBER 3: ADVANCED SQL QUERIES
-- SMARTMART INVENTORY MANAGEMENT SYSTEM
-- =====================================================


-- =====================================================
-- 1. INNER JOIN
-- Products with their Category
-- =====================================================

SELECT
    p.product_id,
    p.product_name,
    p.price,
    c.category_name
FROM product p
INNER JOIN category c
    ON p.category_id = c.category_id;


-- =====================================================
-- 2. MULTI-TABLE INNER JOIN
-- Products with Category and Supplier
-- =====================================================

SELECT
    p.product_id,
    p.product_name,
    p.price,
    c.category_name,
    s.supplier_name
FROM product p
INNER JOIN category c
    ON p.category_id = c.category_id
INNER JOIN supplier s
    ON p.supplier_id = s.supplier_id;


-- =====================================================
-- 3. MULTI-TABLE INNER JOIN
-- Customer → Orders → Order Details → Product
-- =====================================================

SELECT
    c.customer_id,
    c.name AS customer_name,
    o.order_id,
    o.order_date,
    p.product_name,
    od.quantity,
    od.unit_price
FROM customer c
INNER JOIN orders o
    ON c.customer_id = o.customer_id
INNER JOIN order_details od
    ON o.order_id = od.order_id
INNER JOIN product p
    ON od.product_id = p.product_id;


-- =====================================================
-- 4. AGGREGATE
-- Total Sales
-- =====================================================

SELECT
    SUM(od.quantity * od.unit_price) AS total_sales
FROM order_details od;


-- =====================================================
-- 5. AGGREGATE
-- Number of Orders per Customer
-- =====================================================

SELECT
    c.customer_id,
    c.name AS customer_name,
    COUNT(o.order_id) AS total_orders
FROM customer c
LEFT JOIN orders o
    ON c.customer_id = o.customer_id
GROUP BY
    c.customer_id,
    c.name;


-- =====================================================
-- 6. AGGREGATE
-- Average Product Price by Category
-- =====================================================

SELECT
    c.category_id,
    c.category_name,
    AVG(p.price) AS average_price
FROM category c
INNER JOIN product p
    ON c.category_id = p.category_id
GROUP BY
    c.category_id,
    c.category_name;


-- =====================================================
-- 7. GROUP BY + HAVING
-- Categories Having More Than 2 Products
-- =====================================================

SELECT
    c.category_id,
    c.category_name,
    COUNT(p.product_id) AS product_count
FROM category c
INNER JOIN product p
    ON c.category_id = p.category_id
GROUP BY
    c.category_id,
    c.category_name
HAVING COUNT(p.product_id) > 2;


-- =====================================================
-- 8. NESTED QUERY
-- Highest-Priced Product
-- =====================================================

SELECT
    product_id,
    product_name,
    price
FROM product
WHERE price = (
    SELECT MAX(price)
    FROM product
);


-- =====================================================
-- 9. NESTED QUERY
-- Customers Who Have Placed an Order
-- =====================================================

SELECT
    customer_id,
    name
FROM customer
WHERE customer_id IN (
    SELECT customer_id
    FROM orders
);


-- =====================================================
-- 10. NESTED QUERY
-- Products Above Average Price
-- =====================================================

SELECT
    product_id,
    product_name,
    price
FROM product
WHERE price > (
    SELECT AVG(price)
    FROM product
);


-- =====================================================
-- 11. NESTED QUERY
-- Customers Who Have Not Placed Any Order
-- =====================================================

SELECT
    c.customer_id,
    c.name
FROM customer c
WHERE c.customer_id NOT IN (
    SELECT o.customer_id
    FROM orders o
);


-- =====================================================
-- 12. AGGREGATE
-- Minimum, Maximum and Average Product Price
-- =====================================================

SELECT
    MIN(price) AS minimum_price,
    MAX(price) AS maximum_price,
    AVG(price) AS average_price
FROM product;


-- =====================================================
-- 13. AGGREGATE
-- Number of Products in Each Category
-- =====================================================

SELECT
    c.category_id,
    c.category_name,
    COUNT(p.product_id) AS total_products
FROM category c
LEFT JOIN product p
    ON c.category_id = p.category_id
GROUP BY
    c.category_id,
    c.category_name;


-- =====================================================
-- 14. SALES REPORT
-- Total Sales by Product
-- =====================================================

SELECT
    p.product_id,
    p.product_name,
    SUM(od.quantity * od.unit_price) AS total_sales
FROM product p
INNER JOIN order_details od
    ON p.product_id = od.product_id
GROUP BY
    p.product_id,
    p.product_name
ORDER BY total_sales DESC;


-- =====================================================
-- 15. SALES REPORT
-- Top-Selling Products by Quantity
-- =====================================================

SELECT
    p.product_id,
    p.product_name,
    SUM(od.quantity) AS total_quantity_sold
FROM product p
INNER JOIN order_details od
    ON p.product_id = od.product_id
GROUP BY
    p.product_id,
    p.product_name
ORDER BY total_quantity_sold DESC;


-- =====================================================
-- 16. SUPPLIER REPORT
-- Products per Supplier
-- =====================================================

SELECT
    s.supplier_id,
    s.supplier_name,
    COUNT(p.product_id) AS total_products
FROM supplier s
LEFT JOIN product p
    ON s.supplier_id = p.supplier_id
GROUP BY
    s.supplier_id,
    s.supplier_name
ORDER BY total_products DESC;


-- =====================================================
-- 17. CUSTOMER REPORT
-- Customer Order History
-- =====================================================

SELECT
    c.customer_id,
    c.name AS customer_name,
    o.order_id,
    o.order_date,
    o.total_amount
FROM customer c
INNER JOIN orders o
    ON c.customer_id = o.customer_id
ORDER BY
    c.customer_id,
    o.order_date DESC;


-- =====================================================
-- 18. INVENTORY REPORT
-- Low-Stock Products
-- =====================================================

SELECT
    p.product_id,
    p.product_name,
    i.current_stock,
    i.reorder_level
FROM product p
INNER JOIN inventory i
    ON p.product_id = i.product_id
WHERE i.current_stock <= i.reorder_level
ORDER BY i.current_stock ASC;


-- =====================================================
-- 19. VIEW
-- Product Inventory Status
-- =====================================================

CREATE OR REPLACE VIEW product_inventory_view AS
SELECT
    p.product_id,
    p.product_name,
    i.current_stock,
    i.reorder_level,
    CASE
        WHEN i.current_stock <= i.reorder_level
        THEN 'LOW STOCK'
        ELSE 'IN STOCK'
    END AS stock_status
FROM product p
INNER JOIN inventory i
    ON p.product_id = i.product_id;


-- =====================================================
-- 20. VIEW
-- Customer Order History
-- =====================================================

CREATE OR REPLACE VIEW customer_order_history_view AS
SELECT
    c.customer_id,
    c.name AS customer_name,
    o.order_id,
    o.order_date,
    o.total_amount
FROM customer c
INNER JOIN orders o
    ON c.customer_id = o.customer_id;


-- =====================================================
-- 21. VIEW
-- Product Sales Report
-- =====================================================

CREATE OR REPLACE VIEW product_sales_report_view AS
SELECT
    p.product_id,
    p.product_name,
    SUM(od.quantity) AS quantity_sold,
    SUM(od.quantity * od.unit_price) AS total_sales
FROM product p
INNER JOIN order_details od
    ON p.product_id = od.product_id
GROUP BY
    p.product_id,
    p.product_name;


-- =====================================================
-- 22. SALES REPORT
-- Sales by Order
-- =====================================================

SELECT
    o.order_id,
    o.order_date,
    c.name AS customer_name,
    SUM(od.quantity * od.unit_price) AS order_sales
FROM orders o
INNER JOIN customer c
    ON o.customer_id = c.customer_id
INNER JOIN order_details od
    ON o.order_id = od.order_id
GROUP BY
    o.order_id,
    o.order_date,
    c.name
ORDER BY o.order_date DESC;


-- =====================================================
-- 23. PAYMENT REPORT
-- Payment Status with Customer Orders
-- =====================================================

SELECT
    o.order_id,
    c.name AS customer_name,
    o.total_amount,
    pay.payment_method,
    pay.payment_status
FROM orders o
INNER JOIN customer c
    ON o.customer_id = c.customer_id
LEFT JOIN payment pay
    ON o.order_id = pay.order_id
ORDER BY o.order_date DESC;


-- =====================================================
-- 24. ORDER REPORT
-- Order Status Summary
-- =====================================================

SELECT
    order_status,
    COUNT(order_id) AS total_orders
FROM orders
GROUP BY order_status
ORDER BY total_orders DESC;