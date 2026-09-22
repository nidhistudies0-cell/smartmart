import { db } from "./db";
import { admin, category, supplier, product, inventory, customer } from "./schema";
import { eq, sql, gt } from "drizzle-orm";

async function main() {
  // ---------- CREATE (seed a few rows) ----------
  const [smartAdmin] = await db
    .insert(admin)
    .values({ name: "Root Admin", email: "admin@smartmart.com", password: "hashed_pw" })
    .returning();

  const [groceries] = await db
    .insert(category)
    .values({ categoryName: "Groceries", adminId: smartAdmin.adminId })
    .returning();

  const [freshSupplier] = await db
    .insert(supplier)
    .values({
      supplierName: "Fresh Farms Pvt Ltd",
      contactNumber: "9876543210",
      email: "contact@freshfarms.com",
      adminId: smartAdmin.adminId,
    })
    .returning();

  const [rice] = await db
    .insert(product)
    .values({
      productName: "Basmati Rice 5kg",
      description: "Premium long-grain rice",
      price: "450.00",
      categoryId: groceries.categoryId,
      supplierId: freshSupplier.supplierId,
      adminId: smartAdmin.adminId,
    })
    .returning();

  await db.insert(inventory).values({
    productId: rice.productId,
    currentStock: 100,
    reorderLevel: 20,
  });

  const [asha] = await db
    .insert(customer)
    .values({
      name: "Asha Rao",
      email: "asha@mail.com",
      password: "hashed_pw",
      phone: "9123456780",
      address: "Chennai, TN",
    })
    .returning();

  console.log("Seeded:", { smartAdmin, groceries, freshSupplier, rice, asha });

  // ---------- READ ----------
  const allProducts = await db.select().from(product);
  console.log("All products:", allProducts);

  // ---------- UPDATE ----------
  await db
    .update(product)
    .set({ price: "470.00" })
    .where(eq(product.productId, rice.productId));

  // ---------- Aggregate example (avg price per category) ----------
  const avgByCategory = await db
    .select({
      categoryId: product.categoryId,
      avgPrice: sql<number>`avg(${product.price})`,
    })
    .from(product)
    .groupBy(product.categoryId);
  console.log("Avg price by category:", avgByCategory);

  // ---------- Low-stock check ----------
  const lowStock = await db
    .select()
    .from(inventory)
    .where(sql`${inventory.currentStock} <= ${inventory.reorderLevel}`);
  console.log("Low stock items:", lowStock);
}

main().catch(console.error);
