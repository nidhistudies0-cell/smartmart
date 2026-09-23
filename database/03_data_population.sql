-- ==============================================================================
-- SMARTMART DBMS: 03_DATA_POPULATION.SQL
-- Member 2: Realistic Supermarket Data Population Script (Raw PostgreSQL)
-- Audited strictly against schema.ts
-- ==============================================================================

-- DATA SAFETY NOTICE:
-- The TRUNCATE statement below is commented out to prevent accidental deletion 
-- of existing database records. Uncomment ONLY if performing a full database reset.
-- TRUNCATE TABLE payment, order_details, orders, cart, inventory, product, supplier, category, customer, admin RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------------------------
-- 1. ADMIN TABLE
-- Schema: admin_id (PK), name, email (UNIQUE), password, role, created_at
-- ------------------------------------------------------------------------------
INSERT INTO admin (name, email, password, role) VALUES
('Super Admin', 'admin@smartmart.com', 'hashed_password_admin1', 'Manager'),
('Store Staff - Rahul', 'rahul.staff@smartmart.com', 'hashed_password_staff1', 'Staff')
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. CUSTOMER TABLE
-- Schema: customer_id (PK), name, email (UNIQUE), password, phone, address, created_at
-- ------------------------------------------------------------------------------
INSERT INTO customer (name, email, password, phone, address) VALUES
('Asha Rao', 'asha.rao@example.com', 'user_password_1', '9876543210', '123 MG Road, Bengaluru, KA'),
('Rahul Sharma', 'rahul.sharma@example.com', 'user_password_2', '9812345678', '45 Park Street, Kolkata, WB'),
('Priya Patel', 'priya.patel@example.com', 'user_password_3', '9988776655', '78 CG Road, Ahmedabad, GJ'),
('Vikram Singh', 'vikram.singh@example.com', 'user_password_4', '9765432109', '12 Connaught Place, New Delhi, DL')
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. CATEGORY TABLE
-- Schema: category_id (PK), category_name (UNIQUE), admin_id (FK -> admin.admin_id)
-- ------------------------------------------------------------------------------
INSERT INTO category (category_name, admin_id)
SELECT name_val, a.admin_id
FROM (VALUES 
    ('Staples & Groceries'),
    ('Dairy & Bakery'),
    ('Beverages'),
    ('Snacks & Packaged Food'),
    ('Household Care')
) AS cats(name_val)
CROSS JOIN (SELECT admin_id FROM admin WHERE email = 'admin@smartmart.com' LIMIT 1) a
ON CONFLICT (category_name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. SUPPLIER TABLE
-- Schema: supplier_id (PK), supplier_name, contact_number, email (UNIQUE), address, admin_id
-- ------------------------------------------------------------------------------
INSERT INTO supplier (supplier_name, contact_number, email, address, admin_id)
SELECT s.supplier_name, s.contact_number, s.email, s.address, a.admin_id
FROM (VALUES 
    ('FreshFarms India Pvt Ltd', '9123456780', 'contact@freshfarms.in', 'Industrial Area, Pune, MH'),
    ('Heritage Dairy Co.', '9234567891', 'sales@heritagedairy.com', 'Dairy Circle, Anand, GJ'),
    ('Beverage Hub Distributors', '9345678902', 'orders@beveragehub.in', 'Outer Ring Road, Bengaluru, KA'),
    ('CleanHome Solutions Ltd', '9456789013', 'info@cleanhome.com', 'MIDC Andheri, Mumbai, MH')
) AS s(supplier_name, contact_number, email, address)
CROSS JOIN (SELECT admin_id FROM admin WHERE email = 'admin@smartmart.com' LIMIT 1) a
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. PRODUCT TABLE
-- Schema: product_id (PK), product_name, description, price, expiry_date, category_id, supplier_id, admin_id
-- ------------------------------------------------------------------------------
INSERT INTO product (product_name, description, price, expiry_date, category_id, supplier_id, admin_id)
SELECT 
    p.product_name, 
    p.description, 
    p.price, 
    p.expiry_date::date, 
    c.category_id, 
    s.supplier_id, 
    a.admin_id
FROM (VALUES 
    ('Basmati Rice 5kg', 'Premium long grain aromatic rice', 499.00, '2027-12-31', 'Staples & Groceries', 'contact@freshfarms.in'),
    ('Aashirvaad Whole Wheat Atta 5kg', '100% pure MP Sharbati wheat flour', 260.00, '2026-11-30', 'Staples & Groceries', 'contact@freshfarms.in'),
    ('Amul Taaza Toned Milk 1L', 'Pasteurised toned milk tetra pack', 72.00, '2026-10-15', 'Dairy & Bakery', 'sales@heritagedairy.com'),
    ('Britannia Brown Bread 400g', 'Whole wheat healthy brown bread', 45.00, '2026-09-30', 'Dairy & Bakery', 'sales@heritagedairy.com'),
    ('Coca-Cola Original Taste 1.5L', 'Refreshing carbonated soft drink', 85.00, '2027-03-31', 'Beverages', 'orders@beveragehub.in'),
    ('Nescafe Classic Instant Coffee 100g', '100% pure instant coffee powder', 320.00, '2027-08-31', 'Beverages', 'orders@beveragehub.in'),
    ('Lay''s India''s Magic Masala 50g', 'Crispy potato chips masala flavor', 20.00, '2026-12-15', 'Snacks & Packaged Food', 'orders@beveragehub.in'),
    ('Cadbury Dairy Milk Silk 150g', 'Smooth & creamy milk chocolate', 175.00, '2027-01-31', 'Snacks & Packaged Food', 'orders@beveragehub.in'),
    ('Surf Excel Easy Wash Detergent 1kg', 'Superior stain removal powder', 140.00, '2028-05-31', 'Household Care', 'info@cleanhome.com'),
    ('Dettol Original Germ Protection Soap 125g', 'Antiseptic bathing soap bar', 42.00, '2027-10-31', 'Household Care', 'info@cleanhome.com')
) AS p(product_name, description, price, expiry_date, category_name, supplier_email)
JOIN category c ON c.category_name = p.category_name
JOIN supplier s ON s.email = p.supplier_email
CROSS JOIN (SELECT admin_id FROM admin WHERE email = 'admin@smartmart.com' LIMIT 1) a;

-- ------------------------------------------------------------------------------
-- 6. INVENTORY TABLE (1-to-1 with Product)
-- Schema: inventory_id (PK), product_id (UNIQUE FK), current_stock, reorder_level, last_updated
-- Includes 3 low-stock products (Milk: 4<=10, Bread: 5<=8, Coffee: 2<=5)
-- ------------------------------------------------------------------------------
INSERT INTO inventory (product_id, current_stock, reorder_level)
SELECT p.product_id, inv.current_stock, inv.reorder_level
FROM (VALUES
    ('Basmati Rice 5kg', 80, 20),
    ('Aashirvaad Whole Wheat Atta 5kg', 50, 15),
    ('Amul Taaza Toned Milk 1L', 4, 10),      -- LOW STOCK DEMO
    ('Britannia Brown Bread 400g', 5, 8),      -- LOW STOCK DEMO
    ('Coca-Cola Original Taste 1.5L', 60, 15),
    ('Nescafe Classic Instant Coffee 100g', 2, 5), -- LOW STOCK DEMO
    ('Lay''s India''s Magic Masala 50g', 120, 30),
    ('Cadbury Dairy Milk Silk 150g', 45, 10),
    ('Surf Excel Easy Wash Detergent 1kg', 35, 10),
    ('Dettol Original Germ Protection Soap 125g', 90, 25)
) AS inv(product_name, current_stock, reorder_level)
JOIN product p ON p.product_name = inv.product_name
ON CONFLICT (product_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. CART TABLE
-- Schema: cart_id (PK), customer_id (FK), product_id (FK), quantity, added_date
-- ------------------------------------------------------------------------------
INSERT INTO cart (customer_id, product_id, quantity)
SELECT c.customer_id, p.product_id, item.quantity
FROM (VALUES
    ('asha.rao@example.com', 'Basmati Rice 5kg', 1),
    ('asha.rao@example.com', 'Coca-Cola Original Taste 1.5L', 2),
    ('rahul.sharma@example.com', 'Aashirvaad Whole Wheat Atta 5kg', 1),
    ('priya.patel@example.com', 'Cadbury Dairy Milk Silk 150g', 3)
) AS item(customer_email, product_name, quantity)
JOIN customer c ON c.email = item.customer_email
JOIN product p ON p.product_name = item.product_name
ON CONFLICT (customer_id, product_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 8. ORDERS TABLE
-- Schema: order_id (PK), customer_id (FK), order_date, order_status, total_amount
-- Enums: 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'
-- ------------------------------------------------------------------------------
INSERT INTO orders (customer_id, order_status, total_amount)
SELECT c.customer_id, o.order_status::order_status, o.total_amount
FROM (VALUES
    ('asha.rao@example.com', 'Delivered', 669.00),
    ('rahul.sharma@example.com', 'Confirmed', 260.00),
    ('priya.patel@example.com', 'Pending', 525.00),
    ('vikram.singh@example.com', 'Cancelled', 140.00)
) AS o(customer_email, order_status, total_amount)
JOIN customer c ON c.email = o.customer_email;

-- ------------------------------------------------------------------------------
-- 9. ORDER_DETAILS TABLE
-- Schema: order_detail_id (PK), order_id (FK), product_id (FK), quantity, unit_price
-- ------------------------------------------------------------------------------
INSERT INTO order_details (order_id, product_id, quantity, unit_price)
SELECT o.order_id, p.product_id, od.quantity, od.unit_price
FROM (VALUES
    ('asha.rao@example.com', 'Delivered', 'Basmati Rice 5kg', 1, 499.00),
    ('asha.rao@example.com', 'Delivered', 'Coca-Cola Original Taste 1.5L', 2, 85.00),
    ('rahul.sharma@example.com', 'Confirmed', 'Aashirvaad Whole Wheat Atta 5kg', 1, 260.00),
    ('priya.patel@example.com', 'Pending', 'Cadbury Dairy Milk Silk 150g', 3, 175.00),
    ('vikram.singh@example.com', 'Cancelled', 'Surf Excel Easy Wash Detergent 1kg', 1, 140.00)
) AS od(customer_email, order_status, product_name, quantity, unit_price)
JOIN customer c ON c.email = od.customer_email
JOIN orders o ON o.customer_id = c.customer_id AND o.order_status = od.order_status::order_status
JOIN product p ON p.product_name = od.product_name;

-- ------------------------------------------------------------------------------
-- 10. PAYMENT TABLE (1-to-1 with Orders)
-- Schema: payment_id (PK), order_id (UNIQUE FK), payment_method, payment_status, amount
-- Enums: payment_method ('Cash','Card','UPI','NetBanking','Wallet'), payment_status ('Pending','Completed','Failed','Refunded')
-- ------------------------------------------------------------------------------
INSERT INTO payment (order_id, payment_method, payment_status, amount)
SELECT o.order_id, pay.payment_method::payment_method, pay.payment_status::payment_status, pay.amount
FROM (VALUES
    ('asha.rao@example.com', 'Delivered', 'UPI', 'Completed', 669.00),
    ('rahul.sharma@example.com', 'Confirmed', 'Card', 'Completed', 260.00),
    ('priya.patel@example.com', 'Pending', 'NetBanking', 'Pending', 525.00),
    ('vikram.singh@example.com', 'Cancelled', 'Wallet', 'Refunded', 140.00)
) AS pay(customer_email, order_status, payment_method, payment_status, amount)
JOIN customer c ON c.email = pay.customer_email
JOIN orders o ON o.customer_id = c.customer_id AND o.order_status = pay.order_status::order_status
ON CONFLICT (order_id) DO NOTHING;
