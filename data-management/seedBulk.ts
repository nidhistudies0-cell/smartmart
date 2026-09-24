// data-management/seedBulk.ts
// Adds a demo-worthy amount of data on top of the base dataset:
// 10 categories, 10 suppliers, ~55 new products, ~30 new customers,
// ~90 orders spread over the last 6 months, matching order_details / payments.
// Called at the end of populateSmartMartData() in seedData.ts.
// Deterministic (seeded RNG), so every teammate gets the same shape of data.

import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  admin,
  category,
  supplier,
  product,
  inventory,
  customer,
  cart,
  orders,
  orderDetails,
  payment,
} from "../schema";

// ---------- knobs ----------
const N_CUSTOMERS = 30;
const N_ORDERS = 90;
const N_CARTS = 15;
const NO_ORDER_CUSTOMERS = 4; // newest customers never order -> "customers with no orders" query has rows

// ---------- tiny deterministic RNG ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const rint = (a: number, b: number) => Math.floor(rand() * (b - a + 1)) + a;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function sample<T>(arr: T[], k: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
const DAY = 864e5;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// ---------- reference data ----------
const SUPPLIERS = [
  { supplierName: "FreshFarms India Pvt Ltd", contactNumber: "9123456780", email: "contact@freshfarms.in", address: "Industrial Area, Pune, MH" },
  { supplierName: "Heritage Dairy Co.", contactNumber: "9234567891", email: "sales@heritagedairy.com", address: "Dairy Circle, Anand, GJ" },
  { supplierName: "Beverage Hub Distributors", contactNumber: "9345678902", email: "orders@beveragehub.in", address: "Outer Ring Road, Bengaluru, KA" },
  { supplierName: "CleanHome Solutions Ltd", contactNumber: "9456789013", email: "info@cleanhome.com", address: "MIDC Andheri, Mumbai, MH" },
  { supplierName: "Green Valley Produce", contactNumber: "9567890124", email: "fresh@greenvalley.in", address: "APMC Market, Nashik, MH" },
  { supplierName: "Spice Route Traders", contactNumber: "9678901235", email: "sales@spiceroute.in", address: "Spice Market, Kochi, KL" },
  { supplierName: "Frosty Foods Pvt Ltd", contactNumber: "9789012346", email: "orders@frostyfoods.in", address: "Cold Chain Park, Hyderabad, TS" },
  { supplierName: "Glow Personal Care", contactNumber: "9890123457", email: "care@glowpc.com", address: "Sector 62, Noida, UP" },
  { supplierName: "Little Steps Baby Products", contactNumber: "9901234568", email: "hello@littlesteps.in", address: "SIPCOT Park, Chennai, TN" },
  { supplierName: "National Snacks Distributors", contactNumber: "9012345679", email: "trade@nationalsnacks.in", address: "Kalbadevi, Mumbai, MH" },
];

// [name, price, shelfLifeDays]  (short shelf life => near-expiry demo rows)
type Item = [name: string, price: number, shelfDays: number];
const CATALOG: Record<string, { supplierEmail: string; items: Item[] }> = {
  "Staples & Groceries": {
    supplierEmail: "contact@freshfarms.in",
    items: [
      ["Tata Sampann Toor Dal 1kg", 165, 365],
      ["Madhur Sugar 1kg", 48, 540],
      ["Fortune Sunflower Oil 1L", 145, 300],
      ["Sona Masoori Rice 10kg", 720, 540],
      ["Rajdhani Besan 500g", 62, 240],
    ],
  },
  "Pulses & Spices": {
    supplierEmail: "sales@spiceroute.in",
    items: [
      ["Chana Dal 1kg", 120, 365],
      ["Moong Dal 1kg", 135, 365],
      ["MDH Garam Masala 100g", 92, 540],
      ["Everest Turmeric Powder 200g", 68, 540],
      ["Everest Red Chilli Powder 200g", 84, 540],
      ["Cumin Seeds (Jeera) 100g", 75, 540],
    ],
  },
  "Dairy & Bakery": {
    supplierEmail: "sales@heritagedairy.com",
    items: [
      ["Amul Butter 500g", 285, 60],
      ["Amul Cheese Slices 200g", 140, 120],
      ["Mother Dairy Curd 400g", 35, 10],
      ["Amul Fresh Paneer 200g", 95, 14],
      ["Modern White Bread 400g", 40, 6],
      ["Harvest Gold Pav 200g", 30, 4],
    ],
  },
  Beverages: {
    supplierEmail: "orders@beveragehub.in",
    items: [
      ["Pepsi 2L", 95, 300],
      ["Bru Instant Coffee 100g", 265, 540],
      ["Tata Tea Gold 500g", 290, 540],
      ["Real Fruit Power Mixed Fruit 1L", 110, 180],
      ["Bisleri Mineral Water 1L", 20, 365],
      ["Red Bull Energy Drink 250ml", 125, 365],
    ],
  },
  "Snacks & Packaged Food": {
    supplierEmail: "trade@nationalsnacks.in",
    items: [
      ["Maggi 2-Minute Noodles 280g", 68, 270],
      ["Kurkure Masala Munch 90g", 20, 150],
      ["Parle-G Biscuits 800g", 80, 240],
      ["Haldiram's Aloo Bhujia 400g", 110, 180],
      ["Oreo Biscuits 120g", 40, 240],
      ["Kellogg's Corn Flakes 475g", 210, 300],
      ["Kissan Mixed Fruit Jam 500g", 165, 400],
    ],
  },
  "Household Care": {
    supplierEmail: "info@cleanhome.com",
    items: [
      ["Vim Dishwash Gel 500ml", 105, 900],
      ["Harpic Toilet Cleaner 500ml", 95, 900],
      ["Lizol Floor Cleaner 975ml", 195, 900],
      ["Comfort Fabric Conditioner 860ml", 230, 800],
      ["Colin Glass Cleaner 500ml", 98, 800],
    ],
  },
  "Fruits & Vegetables": {
    supplierEmail: "fresh@greenvalley.in",
    items: [
      ["Fresh Onions 1kg", 40, 20],
      ["Potatoes 1kg", 35, 25],
      ["Tomatoes 1kg", 45, 7],
      ["Bananas (1 dozen)", 60, 5],
      ["Apples Shimla 1kg", 180, 14],
      ["Fresh Spinach 250g", 25, 3],
    ],
  },
  "Frozen Foods": {
    supplierEmail: "orders@frostyfoods.in",
    items: [
      ["McCain French Fries 420g", 150, 180],
      ["Frozen Green Peas 500g", 90, 240],
      ["Amul Vanilla Ice Cream 1L", 240, 270],
      ["Sumeru Chicken Nuggets 400g", 275, 150],
      ["Frozen Malabar Paratha 5pc", 110, 150],
    ],
  },
  "Personal Care": {
    supplierEmail: "care@glowpc.com",
    items: [
      ["Colgate Strong Teeth 200g", 110, 900],
      ["Head & Shoulders Shampoo 340ml", 340, 900],
      ["Dove Cream Beauty Bar 100g", 68, 900],
      ["Nivea Body Lotion 400ml", 350, 800],
      ["Pears Soap 125g", 78, 900],
    ],
  },
  "Baby Care": {
    supplierEmail: "hello@littlesteps.in",
    items: [
      ["Pampers Diapers M 42pc", 899, 900],
      ["Cerelac Wheat Apple 300g", 235, 300],
      ["Johnson's Baby Powder 400g", 285, 800],
      ["Himalaya Baby Lotion 400ml", 250, 800],
      ["Huggies Baby Wipes 72pc", 199, 700],
    ],
  },
};

const FIRST = ["Aarav", "Diya", "Rohan", "Meera", "Karthik", "Sneha", "Arjun", "Kavya", "Imran", "Neha", "Suresh", "Lakshmi", "Faisal", "Pooja", "Manoj"];
const LAST = ["Iyer", "Nair", "Reddy", "Khan", "Gupta", "Menon", "Das", "Joshi", "Pillai", "Verma"];
const CITIES = [
  "Chennai, TN", "Coimbatore, TN", "Madurai, TN", "Bengaluru, KA", "Hyderabad, TS", "Kochi, KL",
  "Mumbai, MH", "Pune, MH", "Delhi, DL", "Kolkata, WB", "Ahmedabad, GJ", "Jaipur, RJ",
];

type Status = "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled";
const METHODS = ["Cash", "Card", "UPI", "NetBanking", "Wallet"] as const;

function pickStatus(daysAgo: number): Status {
  const r = rand();
  if (daysAgo > 14) return r < 0.88 ? "Delivered" : "Cancelled"; // old orders are settled
  if (r < 0.4) return "Delivered";
  if (r < 0.55) return "Shipped";
  if (r < 0.72) return "Confirmed";
  if (r < 0.9) return "Pending";
  return "Cancelled";
}

// ---------- main ----------
export async function populateBulkData() {
  console.log("\n➡️ Adding bulk demo data (products, customers, orders)...");

  // admin (reuse the first one, create if DB is empty)
  let [adm] = await db.select().from(admin).limit(1);
  if (!adm) {
    [adm] = await db
      .insert(admin)
      .values({ name: "Super Admin", email: "admin@smartmart.com", password: "hashed_password_admin1", role: "Manager" })
      .returning();
  }

  // categories
  await db
    .insert(category)
    .values(Object.keys(CATALOG).map((n) => ({ categoryName: n, adminId: adm.adminId })))
    .onConflictDoNothing();
  const catId = new Map((await db.select().from(category)).map((c) => [c.categoryName, c.categoryId]));

  // suppliers
  await db
    .insert(supplier)
    .values(SUPPLIERS.map((s) => ({ ...s, adminId: adm.adminId })))
    .onConflictDoNothing();
  const supId = new Map((await db.select().from(supplier)).map((s) => [s.email!, s.supplierId]));

  // products (skip names that already exist)
  const existing = new Set((await db.select({ n: product.productName }).from(product)).map((r) => r.n));
  const newProducts: (typeof product.$inferInsert)[] = [];
  for (const [cat, { supplierEmail, items }] of Object.entries(CATALOG)) {
    for (const [name, price, shelf] of items) {
      if (existing.has(name)) continue;
      newProducts.push({
        productName: name,
        price: price.toFixed(2),
        expiryDate: isoDate(new Date(Date.now() + shelf * DAY)),
        categoryId: catId.get(cat)!,
        supplierId: supId.get(supplierEmail)!,
        adminId: adm.adminId,
      });
    }
  }
  const insertedProducts: (typeof product.$inferSelect)[] = [];
  for (const c of chunk(newProducts, 50)) insertedProducts.push(...(await db.insert(product).values(c).returning()));

  // inventory for the new products (~20% deliberately low stock)
  const invRows = insertedProducts.map((p) => {
    const reorderLevel = pick([10, 15, 20, 25, 30]);
    const currentStock = rand() < 0.2 ? rint(0, reorderLevel) : rint(reorderLevel + 5, reorderLevel * 6);
    return { productId: p.productId, currentStock, reorderLevel };
  });
  for (const c of chunk(invRows, 50)) await db.insert(inventory).values(c).onConflictDoNothing();

  // customers
  const custRows = Array.from({ length: N_CUSTOMERS }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 3 + 1) % LAST.length];
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
      password: `hashed_password_${i + 1}`,
      phone: `${pick(["6", "7", "8", "9"])}${rint(100000000, 999999999)}`,
      address: `${rint(1, 250)} ${pick(["MG Road", "Gandhi Street", "Anna Nagar", "Park Avenue", "Lake View Road"])}, ${pick(CITIES)}`,
    };
  });
  const insertedCustomers = await db.insert(customer).values(custRows).onConflictDoNothing().returning();
  const noOrderIds = new Set(insertedCustomers.slice(-NO_ORDER_CUSTOMERS).map((c) => c.customerId));
  const allCustomers = await db.select().from(customer);
  const eligible = allCustomers.filter((c) => !noOrderIds.has(c.customerId));

  // orders -> order_details -> payment (totals always match the line items)
  const allProducts = await db.select({ id: product.productId, price: product.price }).from(product);
  const plans = Array.from({ length: N_ORDERS }, () => {
    const daysAgo = rint(0, 180);
    const orderDate = new Date(Date.now() - daysAgo * DAY - rint(0, 86399) * 1000);
    const lines = sample(allProducts, rint(1, 5)).map((p) => ({
      productId: p.id,
      quantity: rint(1, 4),
      unitPrice: p.price,
    }));
    const total = lines.reduce((s, l) => s + l.quantity * parseFloat(l.unitPrice), 0);
    return { cust: pick(eligible), orderDate, status: pickStatus(daysAgo), lines, total };
  });

  const insertedOrders: (typeof orders.$inferSelect)[] = [];
  for (const c of chunk(plans, 50)) {
    insertedOrders.push(
      ...(await db
        .insert(orders)
        .values(
          c.map((p) => ({
            customerId: p.cust.customerId,
            orderDate: p.orderDate,
            orderStatus: p.status,
            totalAmount: p.total.toFixed(2),
          }))
        )
        .returning())
    );
  }

  const detailRows = plans.flatMap((p, i) =>
    p.lines.map((l) => ({ orderId: insertedOrders[i].orderId, ...l }))
  );
  for (const c of chunk(detailRows, 100)) await db.insert(orderDetails).values(c);

  const payRows = plans.map((p, i) => ({
    orderId: insertedOrders[i].orderId,
    paymentMethod: pick(METHODS),
    paymentStatus: (p.status === "Cancelled"
      ? rand() < 0.8 ? "Refunded" : "Failed"
      : p.status === "Pending"
      ? "Pending"
      : "Completed") as "Pending" | "Completed" | "Failed" | "Refunded",
    paymentDate: new Date(p.orderDate.getTime() + rint(1, 30) * 60000),
    amount: p.total.toFixed(2),
  }));
  for (const c of chunk(payRows, 50)) await db.insert(payment).values(c);

  // carts
  const cartRows = Array.from({ length: N_CARTS }, () => ({
    customerId: pick(allCustomers).customerId,
    productId: pick(allProducts).id,
    quantity: rint(1, 4),
  }));
  await db.insert(cart).values(cartRows).onConflictDoNothing();

  // summary
  const counts: Record<string, number> = {};
  for (const t of ["admin", "customer", "category", "supplier", "product", "inventory", "cart", "orders", "order_details", "payment"]) {
    const r = await db.execute(sql`select count(*)::int as n from ${sql.identifier(t)}`);
    counts[t] = (r.rows[0] as { n: number }).n;
  }
  console.log("✅ Bulk seed complete. Row counts:");
  console.table(counts);

}