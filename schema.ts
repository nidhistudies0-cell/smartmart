import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const orderStatusEnum = pgEnum("order_status", [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "Cash",
  "Card",
  "UPI",
  "NetBanking",
  "Wallet",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
]);

// ---------- 1. ADMIN ----------
export const admin = pgTable("admin", {
  adminId: serial("admin_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("Staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 2. CUSTOMER ----------
export const customer = pgTable("customer", {
  customerId: serial("customer_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }),
  address: varchar("address", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 3. CATEGORY ----------
export const category = pgTable("category", {
  categoryId: serial("category_id").primaryKey(),
  categoryName: varchar("category_name", { length: 100 }).notNull().unique(),
  adminId: integer("admin_id").references(() => admin.adminId, {
    onDelete: "set null",
  }),
});

// ---------- 4. SUPPLIER ----------
export const supplier = pgTable("supplier", {
  supplierId: serial("supplier_id").primaryKey(),
  supplierName: varchar("supplier_name", { length: 100 }).notNull(),
  contactNumber: varchar("contact_number", { length: 15 }).notNull(),
  email: varchar("email", { length: 100 }).unique(),
  address: varchar("address", { length: 255 }),
  adminId: integer("admin_id").references(() => admin.adminId, {
    onDelete: "set null",
  }),
});

// ---------- 5. PRODUCT ----------
export const product = pgTable("product", {
  productId: serial("product_id").primaryKey(),
  productName: varchar("product_name", { length: 150 }).notNull(),
  description: varchar("description", { length: 500 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  expiryDate: date("expiry_date"),
  categoryId: integer("category_id")
    .notNull()
    .references(() => category.categoryId, { onDelete: "restrict" }),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => supplier.supplierId, { onDelete: "restrict" }),
  adminId: integer("admin_id").references(() => admin.adminId, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 6. INVENTORY (1-to-1 with PRODUCT) ----------
export const inventory = pgTable("inventory", {
  inventoryId: serial("inventory_id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .unique()
    .references(() => product.productId, { onDelete: "cascade" }),
  currentStock: integer("current_stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(10),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// ---------- 7. CART ----------
export const cart = pgTable(
  "cart",
  {
    cartId: serial("cart_id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customer.customerId, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => product.productId, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    addedDate: timestamp("added_date").notNull().defaultNow(),
  },
  (table) => ({
    uqCustomerProduct: unique().on(table.customerId, table.productId),
  })
);

// ---------- 8. ORDERS ----------
export const orders = pgTable("orders", {
  orderId: serial("order_id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customer.customerId, { onDelete: "restrict" }),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  orderStatus: orderStatusEnum("order_status").notNull().default("Pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
});

// ---------- 9. ORDER_DETAILS ----------
export const orderDetails = pgTable("order_details", {
  orderDetailId: serial("order_detail_id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.orderId, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => product.productId, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

// ---------- 10. PAYMENT (1-to-1 with ORDERS) ----------
export const payment = pgTable("payment", {
  paymentId: serial("payment_id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .unique()
    .references(() => orders.orderId, { onDelete: "cascade" }),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("Pending"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

// =========================================================
// Relations (optional, but enables db.query.<table>.findMany
// with nested relational data — handy for Member 3's joins)
// =========================================================
export const customerRelations = relations(customer, ({ many }) => ({
  orders: many(orders),
  cart: many(cart),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.categoryId],
  }),
  supplier: one(supplier, {
    fields: [product.supplierId],
    references: [supplier.supplierId],
  }),
  inventory: one(inventory, {
    fields: [product.productId],
    references: [inventory.productId],
  }),
  orderDetails: many(orderDetails),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customer, {
    fields: [orders.customerId],
    references: [customer.customerId],
  }),
  orderDetails: many(orderDetails),
  payment: one(payment, {
    fields: [orders.orderId],
    references: [payment.orderId],
  }),
}));

export const orderDetailsRelations = relations(orderDetails, ({ one }) => ({
  order: one(orders, {
    fields: [orderDetails.orderId],
    references: [orders.orderId],
  }),
  product: one(product, {
    fields: [orderDetails.productId],
    references: [product.productId],
  }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  products: many(product),
}));

export const supplierRelations = relations(supplier, ({ many }) => ({
  products: many(product),
}));

export const cartRelations = relations(cart, ({ one }) => ({
  customer: one(customer, {
    fields: [cart.customerId],
    references: [customer.customerId],
  }),
  product: one(product, {
    fields: [cart.productId],
    references: [product.productId],
  }),
}));

