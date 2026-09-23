import { db } from "../db";
import {
  inventory,
  product,
  category,
  supplier,
  orders,
  orderDetails,
  payment,
  paymentMethodEnum,
} from "../schema";
import { eq, sql, lte } from "drizzle-orm";

// =========================================================
// INVENTORY & STOCK OPERATIONS
// =========================================================

/**
 * 1. Display full inventory status table
 */
export async function displayCurrentStock() {
  console.log("\n==================================================");
  console.log("📦 CURRENT INVENTORY STOCK STATUS");
  console.log("==================================================");

  const stockList = await db
    .select({
      inventoryId: inventory.inventoryId,
      productId: product.productId,
      productName: product.productName,
      price: product.price,
      currentStock: inventory.currentStock,
      reorderLevel: inventory.reorderLevel,
      status: sql<string>`
        CASE 
          WHEN ${inventory.currentStock} <= ${inventory.reorderLevel} THEN '⚠️ LOW STOCK'
          ELSE '✅ OK'
        END
      `,
      lastUpdated: inventory.lastUpdated,
    })
    .from(inventory)
    .innerJoin(product, eq(inventory.productId, product.productId))
    .orderBy(inventory.productId);

  console.table(stockList);
  return stockList;
}

/**
 * 2. Manual stock update / Restocking inventory
 */
export async function updateStockLevel(productId: number, newStockQuantity: number) {
  console.log(`\n📦 [STOCK UPDATE] Updating stock for Product ID ${productId} to ${newStockQuantity} units...`);
  
  const [updated] = await db
    .update(inventory)
    .set({
      currentStock: newStockQuantity,
      lastUpdated: new Date(),
    })
    .where(eq(inventory.productId, productId))
    .returning();

  console.log(`✅ Stock updated successfully for Product ID ${productId}:`, updated);
  return updated;
}

/**
 * 3. Restock inventory by adding quantity
 */
export async function restockProduct(productId: number, additionalQuantity: number) {
  console.log(`\n📦 [RESTOCK] Adding ${additionalQuantity} units to Product ID ${productId}...`);
  
  const [updated] = await db
    .update(inventory)
    .set({
      currentStock: sql`${inventory.currentStock} + ${additionalQuantity}`,
      lastUpdated: new Date(),
    })
    .where(eq(inventory.productId, productId))
    .returning();

  console.log(`✅ Product ID ${productId} restocked. New Stock: ${updated.currentStock}`);
  return updated;
}

/**
 * 4. Simulate Customer Purchase & Automatic Stock Deduction
 * Implements strict negative-stock prevention.
 */
export async function simulatePurchase(
  customerId: number,
  items: { productId: number; quantity: number }[],
  paymentMethod: "Cash" | "Card" | "UPI" | "NetBanking" | "Wallet"
) {
  console.log("\n==================================================");
  console.log(`🛒 SIMULATING PURCHASE FOR CUSTOMER ID ${customerId}`);
  console.log("==================================================");

  // Step A: Stock validation & pre-check for negative stock prevention
  console.log("🔍 Checking stock availability for requested items...");
  const itemDetails: {
    productId: number;
    productName: string;
    unitPrice: string;
    requestedQty: number;
    currentStock: number;
  }[] = [];

  let grandTotal = 0;

  for (const item of items) {
    const [prodWithStock] = await db
      .select({
        productId: product.productId,
        productName: product.productName,
        price: product.price,
        currentStock: inventory.currentStock,
      })
      .from(product)
      .innerJoin(inventory, eq(product.productId, inventory.productId))
      .where(eq(product.productId, item.productId));

    if (!prodWithStock) {
      throw new Error(`Product ID ${item.productId} not found in store catalog.`);
    }

    if (prodWithStock.currentStock < item.quantity) {
      console.log(
        `❌ PURCHASE ABORTED: Insufficient stock for "${prodWithStock.productName}" (ID ${item.productId}). Requested: ${item.quantity}, Available: ${prodWithStock.currentStock}.`
      );
      return {
        success: false,
        reason: `Insufficient stock for product ID ${item.productId} (${prodWithStock.productName}).`,
      };
    }

    const priceNum = parseFloat(prodWithStock.price);
    grandTotal += priceNum * item.quantity;

    itemDetails.push({
      productId: prodWithStock.productId,
      productName: prodWithStock.productName,
      unitPrice: prodWithStock.price,
      requestedQty: item.quantity,
      currentStock: prodWithStock.currentStock,
    });
  }

  console.log("✅ Stock check passed! Total Order Amount: ₹" + grandTotal.toFixed(2));

  // Step B: Deduct stock from Inventory (Automatic Stock Reduction)
  console.log("⚡ Deducting purchased quantities from Inventory...");
  for (const item of itemDetails) {
    const newStock = item.currentStock - item.requestedQty;
    await db
      .update(inventory)
      .set({
        currentStock: newStock,
        lastUpdated: new Date(),
      })
      .where(eq(inventory.productId, item.productId));

    console.log(
      `   • Product "${item.productName}" (ID ${item.productId}): ${item.currentStock} -> ${newStock} units`
    );
  }

  // Step C: Create Order Record
  console.log("📝 Creating Order Record...");
  const [newOrder] = await db
    .insert(orders)
    .values({
      customerId: customerId,
      orderStatus: "Confirmed",
      totalAmount: grandTotal.toFixed(2),
    })
    .returning();

  // Step D: Create Order Details (Line items)
  console.log("📝 Creating Order Details...");
  const orderDetailInserts = itemDetails.map((item) => ({
    orderId: newOrder.orderId,
    productId: item.productId,
    quantity: item.requestedQty,
    unitPrice: item.unitPrice,
  }));

  await db.insert(orderDetails).values(orderDetailInserts);

  // Step E: Create Payment Record
  console.log(`💳 Processing ${paymentMethod} Payment...`);
  const [newPayment] = await db
    .insert(payment)
    .values({
      orderId: newOrder.orderId,
      paymentMethod: paymentMethod,
      paymentStatus: "Completed",
      amount: grandTotal.toFixed(2),
    })
    .returning();

  console.log("🎉 PURCHASE SIMULATION COMPLETED SUCCESSFULLY!");
  console.log(`Receipt: Order ID #${newOrder.orderId} | Payment ID #${newPayment.paymentId} | Total Paid: ₹${newPayment.amount}`);

  return {
    success: true,
    orderId: newOrder.orderId,
    totalAmount: grandTotal.toFixed(2),
    items: itemDetails,
  };
}

/**
 * 5. Low-Stock Detection & Notification
 * Detects products where currentStock <= reorderLevel
 */
export async function checkLowStock() {
  console.log("\n==================================================");
  console.log("🚨 LOW-STOCK DETECTION & ALERTS");
  console.log("==================================================");

  const lowStockItems = await db
    .select({
      productId: product.productId,
      productName: product.productName,
      categoryName: category.categoryName,
      supplierName: supplier.supplierName,
      currentStock: inventory.currentStock,
      reorderLevel: inventory.reorderLevel,
      shortfall: sql<number>`${inventory.reorderLevel} - ${inventory.currentStock}`,
    })
    .from(inventory)
    .innerJoin(product, eq(inventory.productId, product.productId))
    .innerJoin(category, eq(product.categoryId, category.categoryId))
    .innerJoin(supplier, eq(product.supplierId, supplier.supplierId))
    .where(lte(inventory.currentStock, inventory.reorderLevel));

  if (lowStockItems.length === 0) {
    console.log("✅ All products have sufficient stock levels. No reorder required.");
  } else {
    console.log(`⚠️ ALERT: ${lowStockItems.length} product(s) require reordering!`);
    console.table(lowStockItems);
  }

  return lowStockItems;
}
