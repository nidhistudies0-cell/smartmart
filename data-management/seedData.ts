import { db } from "../db";
import {
  admin,
  customer,
  category,
  supplier,
  product,
  inventory,
  cart,
  orders,
  orderDetails,
  payment,
} from "../schema";

export async function clearAllData() {
  console.log("🧹 Clearing existing SmartMart database data...");
  // Delete in reverse order of foreign key dependencies
  await db.delete(payment);
  await db.delete(orderDetails);
  await db.delete(orders);
  await db.delete(cart);
  await db.delete(inventory);
  await db.delete(product);
  await db.delete(supplier);
  await db.delete(category);
  await db.delete(customer);
  await db.delete(admin);
  console.log("✅ Database cleared successfully.");
}

export async function populateSmartMartData() {
  console.log("\n==================================================");
  console.log("🌱 POPULATING SMARTMART SUPERMARKET DATASET");
  console.log("==================================================");

  await clearAllData();

  // 1. ADMINS (2)
  console.log("➡️ Inserting Admins...");
  const insertedAdmins = await db
    .insert(admin)
    .values([
      {
        name: "Super Admin",
        email: "admin@smartmart.com",
        password: "hashed_password_admin1",
        role: "Manager",
      },
      {
        name: "Store Staff - Rahul",
        email: "rahul.staff@smartmart.com",
        password: "hashed_password_staff1",
        role: "Staff",
      },
    ])
    .returning();

  const mainAdminId = insertedAdmins[0].adminId;

  // 2. CUSTOMERS (4)
  console.log("➡️ Inserting Customers...");
  const insertedCustomers = await db
    .insert(customer)
    .values([
      {
        name: "Asha Rao",
        email: "asha.rao@example.com",
        password: "user_password_1",
        phone: "9876543210",
        address: "123 MG Road, Bengaluru, KA",
      },
      {
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        password: "user_password_2",
        phone: "9812345678",
        address: "45 Park Street, Kolkata, WB",
      },
      {
        name: "Priya Patel",
        email: "priya.patel@example.com",
        password: "user_password_3",
        phone: "9988776655",
        address: "78 CG Road, Ahmedabad, GJ",
      },
      {
        name: "Vikram Singh",
        email: "vikram.singh@example.com",
        password: "user_password_4",
        phone: "9765432109",
        address: "12 Connaught Place, New Delhi, DL",
      },
    ])
    .returning();

  // 3. CATEGORIES (5)
  console.log("➡️ Inserting Categories...");
  const insertedCategories = await db
    .insert(category)
    .values([
      { categoryName: "Staples & Groceries", adminId: mainAdminId },
      { categoryName: "Dairy & Bakery", adminId: mainAdminId },
      { categoryName: "Beverages", adminId: mainAdminId },
      { categoryName: "Snacks & Packaged Food", adminId: mainAdminId },
      { categoryName: "Household Care", adminId: mainAdminId },
    ])
    .returning();

  const [cStaples, cDairy, cBev, cSnacks, cHousehold] = insertedCategories;

  // 4. SUPPLIERS (4)
  console.log("➡️ Inserting Suppliers...");
  const insertedSuppliers = await db
    .insert(supplier)
    .values([
      {
        supplierName: "FreshFarms India Pvt Ltd",
        contactNumber: "9123456780",
        email: "contact@freshfarms.in",
        address: "Industrial Area, Pune, MH",
        adminId: mainAdminId,
      },
      {
        supplierName: "Heritage Dairy Co.",
        contactNumber: "9234567891",
        email: "sales@heritagedairy.com",
        address: "Dairy Circle, Anand, GJ",
        adminId: mainAdminId,
      },
      {
        supplierName: "Beverage Hub Distributors",
        contactNumber: "9345678902",
        email: "orders@beveragehub.in",
        address: "Outer Ring Road, Bengaluru, KA",
        adminId: mainAdminId,
      },
      {
        supplierName: "CleanHome Solutions Ltd",
        contactNumber: "9456789013",
        email: "info@cleanhome.com",
        address: "MIDC Andheri, Mumbai, MH",
        adminId: mainAdminId,
      },
    ])
    .returning();

  const [sFresh, sDairy, sBev, sClean] = insertedSuppliers;

  // 5. PRODUCTS (10)
  console.log("➡️ Inserting Products...");
  const insertedProducts = await db
    .insert(product)
    .values([
      {
        productName: "Basmati Rice 5kg",
        description: "Premium long grain aromatic rice",
        price: "499.00",
        expiryDate: "2027-12-31",
        categoryId: cStaples.categoryId,
        supplierId: sFresh.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Aashirvaad Whole Wheat Atta 5kg",
        description: "100% pure MP Sharbati wheat flour",
        price: "260.00",
        expiryDate: "2026-11-30",
        categoryId: cStaples.categoryId,
        supplierId: sFresh.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Amul Taaza Toned Milk 1L",
        description: "Pasteurised toned milk tetra pack",
        price: "72.00",
        expiryDate: "2026-10-15",
        categoryId: cDairy.categoryId,
        supplierId: sDairy.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Britannia Brown Bread 400g",
        description: "Whole wheat healthy brown bread",
        price: "45.00",
        expiryDate: "2026-09-30",
        categoryId: cDairy.categoryId,
        supplierId: sDairy.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Coca-Cola Original Taste 1.5L",
        description: "Refreshing carbonated soft drink",
        price: "85.00",
        expiryDate: "2027-03-31",
        categoryId: cBev.categoryId,
        supplierId: sBev.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Nescafe Classic Instant Coffee 100g",
        description: "100% pure instant coffee powder",
        price: "320.00",
        expiryDate: "2027-08-31",
        categoryId: cBev.categoryId,
        supplierId: sBev.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Lay's India's Magic Masala 50g",
        description: "Crispy potato chips masala flavor",
        price: "20.00",
        expiryDate: "2026-12-15",
        categoryId: cSnacks.categoryId,
        supplierId: sBev.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Cadbury Dairy Milk Silk 150g",
        description: "Smooth & creamy milk chocolate",
        price: "175.00",
        expiryDate: "2027-01-31",
        categoryId: cSnacks.categoryId,
        supplierId: sBev.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Surf Excel Easy Wash Detergent 1kg",
        description: "Superior stain removal powder",
        price: "140.00",
        expiryDate: "2028-05-31",
        categoryId: cHousehold.categoryId,
        supplierId: sClean.supplierId,
        adminId: mainAdminId,
      },
      {
        productName: "Dettol Original Germ Protection Soap 125g",
        description: "Antiseptic bathing soap bar",
        price: "42.00",
        expiryDate: "2027-10-31",
        categoryId: cHousehold.categoryId,
        supplierId: sClean.supplierId,
        adminId: mainAdminId,
      },
    ])
    .returning();

  // 6. INVENTORY (10) — 1:1 with products
  // Note: Setting Milk (idx 2), Coffee (idx 5), and Bread (idx 3) to low stock for demonstration!
  console.log("➡️ Inserting Inventory items (including 3 low-stock items)...");
  const insertedInventory = await db
    .insert(inventory)
    .values([
      { productId: insertedProducts[0].productId, currentStock: 80, reorderLevel: 20 },
      { productId: insertedProducts[1].productId, currentStock: 50, reorderLevel: 15 },
      { productId: insertedProducts[2].productId, currentStock: 4, reorderLevel: 10 }, // LOW STOCK!
      { productId: insertedProducts[3].productId, currentStock: 5, reorderLevel: 8 },  // LOW STOCK!
      { productId: insertedProducts[4].productId, currentStock: 60, reorderLevel: 15 },
      { productId: insertedProducts[5].productId, currentStock: 2, reorderLevel: 5 },  // LOW STOCK!
      { productId: insertedProducts[6].productId, currentStock: 120, reorderLevel: 30 },
      { productId: insertedProducts[7].productId, currentStock: 45, reorderLevel: 10 },
      { productId: insertedProducts[8].productId, currentStock: 35, reorderLevel: 10 },
      { productId: insertedProducts[9].productId, currentStock: 90, reorderLevel: 25 },
    ])
    .returning();

  // 7. CART (4 items)
  console.log("➡️ Inserting Cart items...");
  const insertedCart = await db
    .insert(cart)
    .values([
      {
        customerId: insertedCustomers[0].customerId,
        productId: insertedProducts[0].productId,
        quantity: 1,
      },
      {
        customerId: insertedCustomers[0].customerId,
        productId: insertedProducts[4].productId,
        quantity: 2,
      },
      {
        customerId: insertedCustomers[1].customerId,
        productId: insertedProducts[1].productId,
        quantity: 1,
      },
      {
        customerId: insertedCustomers[2].customerId,
        productId: insertedProducts[7].productId,
        quantity: 3,
      },
    ])
    .returning();

  // 8. ORDERS (4 orders)
  console.log("➡️ Inserting Orders...");
  const insertedOrders = await db
    .insert(orders)
    .values([
      {
        customerId: insertedCustomers[0].customerId,
        orderStatus: "Delivered",
        totalAmount: "669.00",
      },
      {
        customerId: insertedCustomers[1].customerId,
        orderStatus: "Confirmed",
        totalAmount: "260.00",
      },
      {
        customerId: insertedCustomers[2].customerId,
        orderStatus: "Pending",
        totalAmount: "525.00",
      },
      {
        customerId: insertedCustomers[3].customerId,
        orderStatus: "Cancelled",
        totalAmount: "140.00",
      },
    ])
    .returning();

  // 9. ORDER_DETAILS (7 line items)
  console.log("➡️ Inserting Order Details...");
  const insertedOrderDetails = await db
    .insert(orderDetails)
    .values([
      // Order 1 (Delivered)
      {
        orderId: insertedOrders[0].orderId,
        productId: insertedProducts[0].productId,
        quantity: 1,
        unitPrice: "499.00",
      },
      {
        orderId: insertedOrders[0].orderId,
        productId: insertedProducts[4].productId,
        quantity: 2,
        unitPrice: "85.00",
      },
      // Order 2 (Confirmed)
      {
        orderId: insertedOrders[1].orderId,
        productId: insertedProducts[1].productId,
        quantity: 1,
        unitPrice: "260.00",
      },
      // Order 3 (Pending)
      {
        orderId: insertedOrders[2].orderId,
        productId: insertedProducts[7].productId,
        quantity: 3,
        unitPrice: "175.00",
      },
      // Order 4 (Cancelled)
      {
        orderId: insertedOrders[3].orderId,
        productId: insertedProducts[8].productId,
        quantity: 1,
        unitPrice: "140.00",
      },
    ])
    .returning();

  // 10. PAYMENT (4 payment records — 1:1 with orders)
  console.log("➡️ Inserting Payments...");
  const insertedPayments = await db
    .insert(payment)
    .values([
      {
        orderId: insertedOrders[0].orderId,
        paymentMethod: "UPI",
        paymentStatus: "Completed",
        amount: "669.00",
      },
      {
        orderId: insertedOrders[1].orderId,
        paymentMethod: "Card",
        paymentStatus: "Completed",
        amount: "260.00",
      },
      {
        orderId: insertedOrders[2].orderId,
        paymentMethod: "NetBanking",
        paymentStatus: "Pending",
        amount: "525.00",
      },
      {
        orderId: insertedOrders[3].orderId,
        paymentMethod: "Wallet",
        paymentStatus: "Refunded",
        amount: "140.00",
      },
    ])
    .returning();

  console.log("\n🎉 DATA POPULATION COMPLETE!");
  console.log(`Summary of inserted records:
  - Admins: ${insertedAdmins.length}
  - Customers: ${insertedCustomers.length}
  - Categories: ${insertedCategories.length}
  - Suppliers: ${insertedSuppliers.length}
  - Products: ${insertedProducts.length}
  - Inventory items: ${insertedInventory.length}
  - Cart items: ${insertedCart.length}
  - Orders: ${insertedOrders.length}
  - Order Details: ${insertedOrderDetails.length}
  - Payments: ${insertedPayments.length}`);

  return {
    admins: insertedAdmins,
    customers: insertedCustomers,
    categories: insertedCategories,
    suppliers: insertedSuppliers,
    products: insertedProducts,
    inventories: insertedInventory,
    carts: insertedCart,
    orders: insertedOrders,
    orderDetails: insertedOrderDetails,
    payments: insertedPayments,
  };
}
