// seed.ts
// One command to reset the DB and load the full demo dataset, then run a short
// READ / UPDATE / aggregate / low-stock demo.
//   npx tsx seed.ts
// WARNING: populateSmartMartData() wipes every table first.

import { db } from "./db";
import { category, product, inventory } from "./schema";
import { eq, sql, lte } from "drizzle-orm";
import { populateSmartMartData } from "./data-management/seedData";

async function main() {
  await populateSmartMartData(); // clears tables, inserts base data, then bulk data

  // ---------- READ ----------
  const firstProducts = await db
    .select({ productId: product.productId, productName: product.productName, price: product.price })
    .from(product)
    .orderBy(product.productId)
    .limit(5);
  console.log("\nREAD - first 5 products:");
  console.table(firstProducts);

  // ---------- UPDATE ----------
  const [updated] = await db
    .update(product)
    .set({ price: "470.00" })
    .where(eq(product.productName, "Basmati Rice 5kg"))
    .returning();
  if (updated) console.log("\nUPDATE - new price:", updated.productName, updated.price);

  // ---------- Aggregate (avg price per category) ----------
  const avgByCategory = await db
    .select({
      categoryName: category.categoryName,
      avgPrice: sql<string>`round(avg(${product.price}), 2)`,
    })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.categoryId))
    .groupBy(category.categoryName);
  console.log("\nAGGREGATE - avg price by category:");
  console.table(avgByCategory);

  // ---------- Low-stock check ----------
  const lowStock = await db
    .select({
      productName: product.productName,
      currentStock: inventory.currentStock,
      reorderLevel: inventory.reorderLevel,
    })
    .from(inventory)
    .innerJoin(product, eq(inventory.productId, product.productId))
    .where(lte(inventory.currentStock, inventory.reorderLevel));
  console.log("\nLOW STOCK items:");
  console.table(lowStock);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});