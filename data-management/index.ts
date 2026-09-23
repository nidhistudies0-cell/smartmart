import { populateSmartMartData } from "./seedData";
import {
  createProductWithInventory,
  createCustomer,
  readAllProductsJoined,
  readProductsByCategory,
  readCustomerOrderHistory,
  updateProductPrice,
  updateCustomerAddress,
  updateOrderStatus,
  deleteCartItem,
  deleteCustomerSafely,
  demonstrateRestrictedProductDelete,
} from "./crudOperations";
import {
  displayCurrentStock,
  updateStockLevel,
  restockProduct,
  simulatePurchase,
  checkLowStock,
} from "./inventoryOperations";

async function runDataManagementDemo() {
  console.log("==========================================================================");
  console.log(" 🛒 SMARTMART: INVENTORY & ONLINE SUPERMARKET DBMS DEMO (MEMBER 2)");
  console.log("==========================================================================");

  try {
    // ---------------------------------------------------------
    // STEP 1: DATA POPULATION
    // ---------------------------------------------------------
    const seed = await populateSmartMartData();

    // ---------------------------------------------------------
    // STEP 2: READ OPERATIONS
    // ---------------------------------------------------------
    console.log("\n==================================================");
    console.log("📖 DEMONSTRATING READ / SELECT OPERATIONS");
    console.log("==================================================");

    await readAllProductsJoined();
    await readProductsByCategory("Dairy & Bakery");
    await readCustomerOrderHistory(seed.customers[0].customerId);

    // ---------------------------------------------------------
    // STEP 3: CREATE OPERATIONS
    // ---------------------------------------------------------
    console.log("\n==================================================");
    console.log("➕ DEMONSTRATING CREATE / INSERT OPERATIONS");
    console.log("==================================================");

    const newProd = await createProductWithInventory({
      productName: "Tata Salt Vacuum Evaporated 1kg",
      description: "Iodised vacuum evaporated salt",
      price: "28.00",
      categoryId: seed.categories[0].categoryId,
      supplierId: seed.suppliers[0].supplierId,
      adminId: seed.admins[0].adminId,
      initialStock: 200,
      reorderLevel: 50,
    });

    const newCust = await createCustomer({
      name: "Ananya Sharma",
      email: "ananya.sharma@example.com",
      password: "ananya_pass_123",
      phone: "9811223344",
      address: "88 Jubilee Hills, Hyderabad, TS",
    });

    // ---------------------------------------------------------
    // STEP 4: UPDATE OPERATIONS
    // ---------------------------------------------------------
    console.log("\n==================================================");
    console.log("✏️ DEMONSTRATING UPDATE OPERATIONS");
    console.log("==================================================");

    await updateProductPrice(seed.products[0].productId, "520.00");
    await updateCustomerAddress(seed.customers[1].customerId, "99 Sector 15, Gurgaon, HR");
    await updateOrderStatus(seed.orders[2].orderId, "Confirmed");

    // ---------------------------------------------------------
    // STEP 5: DELETE OPERATIONS & REFERENTIAL INTEGRITY DEMO
    // ---------------------------------------------------------
    console.log("\n==================================================");
    console.log("🗑️ DEMONSTRATING DELETE OPERATIONS & REFERENTIAL INTEGRITY");
    console.log("==================================================");

    if (seed.carts.length > 0) {
      await deleteCartItem(seed.carts[0].cartId);
    }
    // Delete newly registered customer safely (since they have no placed orders)
    await deleteCustomerSafely(newCust.customerId);
    // Demonstrate Foreign Key RESTRICT block when deleting product with orders
    await demonstrateRestrictedProductDelete(seed.products[0].productId);

    // ---------------------------------------------------------
    // STEP 6: INVENTORY MANAGEMENT & STOCK CONTROL
    // ---------------------------------------------------------
    console.log("\n==================================================");
    console.log("📦 DEMONSTRATING INVENTORY MANAGEMENT & STOCK CONTROL");
    console.log("==================================================");

    // 6.1 Display initial stock status
    await displayCurrentStock();

    // 6.2 Low Stock Detection
    await checkLowStock();

    // 6.3 Restock low-stock item (e.g. Milk)
    await restockProduct(seed.products[2].productId, 20);

    // 6.4 Simulate successful purchase (Automatic Stock Deduction)
    console.log("\n--- Successful Checkout & Purchase Simulation ---");
    await simulatePurchase(
      seed.customers[0].customerId,
      [
        { productId: seed.products[0].productId, quantity: 2 },
        { productId: seed.products[4].productId, quantity: 3 },
      ],
      "UPI"
    );

    // 6.5 Attempt purchase that exceeds available stock (Negative Stock Prevention)
    console.log("\n--- Negative Stock Prevention Test ---");
    await simulatePurchase(
      seed.customers[0].customerId,
      [
        { productId: seed.products[5].productId, quantity: 999 }, // Coffee only has 2 in stock!
      ],
      "Card"
    );

    // 6.6 Display updated inventory status
    await displayCurrentStock();

    // 6.7 Check low stock after purchase
    await checkLowStock();

    console.log("\n==========================================================================");
    console.log("🎉 MEMBER 2 DATA MANAGEMENT DEMO COMPLETED SUCCESSFULLY!");
    console.log("==========================================================================");
  } catch (error) {
    console.error("❌ Error running data management demo:", error);
  }
}

runDataManagementDemo();
