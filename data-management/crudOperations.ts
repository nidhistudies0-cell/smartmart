import { db } from "../db";
import {
  product,
  inventory,
  customer,
  category,
  supplier,
  orders,
  cart,
} from "../schema";
import { eq, sql } from "drizzle-orm";

// =========================================================
// CREATE OPERATIONS
// =========================================================

/**
 * 1. Create a new Product and initialize its inventory record (1-to-1)
 */
export async function createProductWithInventory(data: {
  productName: string;
  description: string;
  price: string;
  expiryDate?: string;
  categoryId: number;
  supplierId: number;
  adminId?: number;
  initialStock: number;
  reorderLevel: number;
}) {
  console.log(`\n🔹 [CREATE] Adding new product: "${data.productName}"...`);
  
  const [newProduct] = await db
    .insert(product)
    .values({
      productName: data.productName,
      description: data.description,
      price: data.price,
      expiryDate: data.expiryDate,
      categoryId: data.categoryId,
      supplierId: data.supplierId,
      adminId: data.adminId,
    })
    .returning();

  const [newInventory] = await db
    .insert(inventory)
    .values({
      productId: newProduct.productId,
      currentStock: data.initialStock,
      reorderLevel: data.reorderLevel,
    })
    .returning();

  console.log("✅ Created Product:", newProduct);
  console.log("✅ Initialized Inventory:", newInventory);
  return { product: newProduct, inventory: newInventory };
}

/**
 * 2. Create a new Customer
 */
export async function createCustomer(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}) {
  console.log(`\n🔹 [CREATE] Registering new customer: "${data.name}" (${data.email})...`);
  const [newCust] = await db.insert(customer).values(data).returning();
  console.log("✅ Customer registered:", newCust);
  return newCust;
}

// =========================================================
// READ / SELECT OPERATIONS
// =========================================================

/**
 * 1. Read all products with Category Name, Supplier Name, and Current Stock (SQL JOIN)
 */
export async function readAllProductsJoined() {
  console.log("\n🔹 [READ] Retrieving all products with Category, Supplier, and Inventory details...");
  const results = await db
    .select({
      productId: product.productId,
      productName: product.productName,
      price: product.price,
      categoryName: category.categoryName,
      supplierName: supplier.supplierName,
      currentStock: inventory.currentStock,
      reorderLevel: inventory.reorderLevel,
    })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.categoryId))
    .innerJoin(supplier, eq(product.supplierId, supplier.supplierId))
    .leftJoin(inventory, eq(product.productId, inventory.productId));

  console.table(results);
  return results;
}

/**
 * 2. Read products filtered by Category
 */
export async function readProductsByCategory(categoryName: string) {
  console.log(`\n🔹 [READ] Filtering products by category: "${categoryName}"...`);
  const results = await db
    .select({
      productId: product.productId,
      productName: product.productName,
      price: product.price,
      categoryName: category.categoryName,
    })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.categoryId))
    .where(eq(category.categoryName, categoryName));

  console.table(results);
  return results;
}

/**
 * 3. Read Customer Order History with Relational Query
 */
export async function readCustomerOrderHistory(customerId: number) {
  console.log(`\n🔹 [READ] Fetching order history for Customer ID ${customerId}...`);
  const custOrders = await db.query.orders.findMany({
    where: eq(orders.customerId, customerId),
    with: {
      customer: true,
      payment: true,
      orderDetails: {
        with: {
          product: true,
        },
      },
    },
  });

  console.log(JSON.stringify(custOrders, null, 2));
  return custOrders;
}

// =========================================================
// UPDATE OPERATIONS
// =========================================================

/**
 * 1. Update Product Price
 */
export async function updateProductPrice(productId: number, newPrice: string) {
  console.log(`\n🔹 [UPDATE] Updating price for Product ID ${productId} to ₹${newPrice}...`);
  const [updated] = await db
    .update(product)
    .set({ price: newPrice })
    .where(eq(product.productId, productId))
    .returning();

  console.log("✅ Updated product:", updated);
  return updated;
}

/**
 * 2. Update Customer Delivery Address
 */
export async function updateCustomerAddress(customerId: number, newAddress: string) {
  console.log(`\n🔹 [UPDATE] Updating address for Customer ID ${customerId}...`);
  const [updated] = await db
    .update(customer)
    .set({ address: newAddress })
    .where(eq(customer.customerId, customerId))
    .returning();

  console.log("✅ Updated customer address:", updated);
  return updated;
}

/**
 * 3. Update Order Status
 */
export async function updateOrderStatus(orderId: number, newStatus: "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled") {
  console.log(`\n🔹 [UPDATE] Updating Order ID ${orderId} status to "${newStatus}"...`);
  const [updated] = await db
    .update(orders)
    .set({ orderStatus: newStatus })
    .where(eq(orders.orderId, orderId))
    .returning();

  console.log("✅ Updated order status:", updated);
  return updated;
}

// =========================================================
// DELETE OPERATIONS (Safely Demonstrating FK Integrity)
// =========================================================

/**
 * 1. Safe Delete: Remove an item from a Customer's Shopping Cart
 */
export async function deleteCartItem(cartId: number) {
  console.log(`\n🔹 [DELETE - Safe] Removing Cart Item ID ${cartId}...`);
  const [deleted] = await db
    .delete(cart)
    .where(eq(cart.cartId, cartId))
    .returning();

  console.log("✅ Cart item deleted successfully:", deleted);
  return deleted;
}

/**
 * 2. Safe Delete: Delete a newly registered customer who has no placed orders
 */
export async function deleteCustomerSafely(customerId: number) {
  console.log(`\n🔹 [DELETE - Safe] Attempting to delete Customer ID ${customerId} (checking for orders)...`);
  
  // Check if customer has orders
  const existingOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId));

  if (existingOrders.length > 0) {
    console.log(`⚠️ Cannot delete Customer ID ${customerId}: Customer has ${existingOrders.length} placed order(s). Foreign Key RESTRICT prevents deletion.`);
    return null;
  }

  const [deleted] = await db
    .delete(customer)
    .where(eq(customer.customerId, customerId))
    .returning();

  console.log("✅ Customer deleted safely (no existing orders):", deleted);
  return deleted;
}

/**
 * 3. Demonstrate Referential Integrity (FK RESTRICT)
 * Attempting to delete a product referenced in order_details will trigger a PostgreSQL Foreign Key Exception.
 */
export async function demonstrateRestrictedProductDelete(productId: number) {
  console.log(`\n🔹 [DELETE - FK Restriction Demo] Attempting to delete Product ID ${productId}...`);
  try {
    await db.delete(product).where(eq(product.productId, productId));
    console.log(`❌ Unexpected: Product ${productId} was deleted!`);
  } catch (error: any) {
    console.log("🛡️ Foreign Key RESTRICT Protection Caught expected DB Error:");
    console.log(`   Error Message: ${error.message || error}`);
    console.log("   Explanation: Product is referenced in order_details with ON DELETE RESTRICT constraint. Database prevented deletion to preserve historical invoice records.");
  }
}
