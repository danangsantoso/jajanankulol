import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  googleSubject: varchar("googleSubject", { length: 128 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordUpdatedAt: timestamp("passwordUpdatedAt"),
  passwordChangeRequired: mysqlEnum("passwordChangeRequired", ["yes", "no"]).notNull().default("no"),
  role: mysqlEnum("role", ["cashier", "admin", "superadmin"]).default("cashier").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  activeBranchId: int("activeBranchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tenants = mysqlTable(
  "tenants",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
    subscriptionStatus: mysqlEnum("subscriptionStatus", ["trial", "active", "expired", "suspended"]).notNull().default("trial"),
    trialEndsAt: timestamp("trialEndsAt"),
    subscriptionStartsAt: timestamp("subscriptionStartsAt"),
    subscriptionEndsAt: timestamp("subscriptionEndsAt"),
    activePlanId: int("activePlanId"),
    ownerName: varchar("ownerName", { length: 160 }),
    whatsappNumber: varchar("whatsappNumber", { length: 24 }),
    businessAddress: varchar("businessAddress", { length: 255 }),
    businessDescription: text("businessDescription"),
    logoKey: varchar("logoKey", { length: 255 }),
    logoUrl: varchar("logoUrl", { length: 512 }),
    onboardingStatus: mysqlEnum("onboardingStatus", ["pending", "complete"]).notNull().default("pending"),
    onboardingCompletedAt: timestamp("onboardingCompletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("tenants_status_idx").on(table.status)],
);

export const subscriptionPlans = mysqlTable(
  "subscriptionPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).notNull().default("bronze"),
    durationDays: int("durationDays").notNull(),
    branchLimit: int("branchLimit").notNull().default(2),
    cashierLimit: int("cashierLimit").notNull().default(2),
    regularPrice: decimal("regularPrice", { precision: 12, scale: 2 }).notNull().default("0"),
    salePrice: decimal("salePrice", { precision: 12, scale: 2 }),
    isActive: mysqlEnum("isActive", ["yes", "no"]).notNull().default("yes"),
    availability: mysqlEnum("availability", ["available", "coming_soon", "archived"]).notNull().default("available"),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("subscription_plans_active_idx").on(table.isActive, table.sortOrder)],
);

export const tenantSubscriptions = mysqlTable(
  "tenantSubscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    planId: int("planId"),
    status: mysqlEnum("status", ["trial", "active", "expired", "cancelled"]).notNull().default("trial"),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    branchLimit: int("branchLimit").notNull().default(2),
    cashierLimit: int("cashierLimit").notNull().default(2),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("tenant_subscriptions_tenant_idx").on(table.tenantId), index("tenant_subscriptions_ends_idx").on(table.endsAt)],
);

export const branches = mysqlTable(
  "branches",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 48 }).notNull(),
    address: varchar("address", { length: 255 }),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("branches_tenant_idx").on(table.tenantId), uniqueIndex("branches_tenant_code_unique").on(table.tenantId, table.code)],
);

export const tenantMembers = mysqlTable(
  "tenantMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    userId: int("userId").notNull(),
    branchId: int("branchId"),
    role: mysqlEnum("role", ["tenant_admin", "branch_admin", "cashier"]).notNull().default("cashier"),
    status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tenant_members_tenant_idx").on(table.tenantId),
    index("tenant_members_user_idx").on(table.userId),
    index("tenant_members_branch_idx").on(table.branchId),
    uniqueIndex("tenant_members_tenant_user_unique").on(table.tenantId, table.userId),
  ],
);

export const tenantInvitations = mysqlTable(
  "tenantInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    branchId: int("branchId").notNull(),
    role: mysqlEnum("role", ["tenant_admin", "branch_admin", "cashier"]).notNull().default("cashier"),
    status: mysqlEnum("status", ["pending", "claimed", "revoked"]).notNull().default("pending"),
    invitedBy: int("invitedBy").notNull(),
    invitedAt: timestamp("invitedAt").defaultNow().notNull(),
    claimedAt: timestamp("claimedAt"),
  },
  table => [
    index("tenant_invitations_tenant_idx").on(table.tenantId),
    index("tenant_invitations_branch_idx").on(table.branchId),
    uniqueIndex("tenant_invitations_tenant_email_unique").on(table.tenantId, table.email),
  ],
);

export const platformSettings = mysqlTable("platformSettings", {
  id: int("id").primaryKey(),
  whatsappNumber: varchar("whatsappNumber", { length: 24 }),
  whatsappMessage: varchar("whatsappMessage", { length: 500 }).default("Halo Jajananku, saya ingin mengetahui solusi POS untuk usaha saya."),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    category: varchar("category", { length: 80 }).notNull().default("Lainnya"),
    imageKey: varchar("imageKey", { length: 255 }),
    imageUrl: varchar("imageUrl", { length: 512 }),
    qrCode: varchar("qrCode", { length: 96 }).notNull().unique(),
    salePrice: decimal("salePrice", { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal("costPrice", { precision: 12, scale: 2 }).notNull(),
    stock: int("stock").notNull().default(0),
    lowStockThreshold: int("lowStockThreshold").notNull().default(5),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    tenantId: int("tenantId"),
    branchId: int("branchId"),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("products_status_idx").on(table.status), index("products_qr_idx").on(table.qrCode), index("products_tenant_branch_idx").on(table.tenantId, table.branchId)],
);

export const promotions = mysqlTable(
  "promotions",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: int("tenantId").notNull(),
    branchId: int("branchId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    type: mysqlEnum("type", ["discount", "bundle"]).notNull(),
    status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
    discountType: mysqlEnum("discountType", ["percentage", "fixed"]),
    discountValue: decimal("discountValue", { precision: 12, scale: 2 }),
    bundlePrice: decimal("bundlePrice", { precision: 12, scale: 2 }),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("promotions_tenant_branch_idx").on(table.tenantId, table.branchId), index("promotions_active_period_idx").on(table.status, table.startsAt, table.endsAt)],
);

export const promotionItems = mysqlTable(
  "promotionItems",
  {
    id: int("id").autoincrement().primaryKey(),
    promotionId: int("promotionId").notNull(),
    productId: int("productId").notNull(),
    quantity: int("quantity").notNull().default(1),
  },
  table => [index("promotion_items_promotion_idx").on(table.promotionId), uniqueIndex("promotion_items_product_unique").on(table.promotionId, table.productId)],
);

export const salesTransactions = mysqlTable(
  "salesTransactions",
  {
    id: int("id").autoincrement().primaryKey(),
    receiptNo: varchar("receiptNo", { length: 40 }).notNull().unique(),
    cashierId: int("cashierId").notNull(),
    tenantId: int("tenantId"),
    branchId: int("branchId"),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "qris"]).notNull(),
    status: mysqlEnum("status", ["paid"]).notNull().default("paid"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountTotal: decimal("discountTotal", { precision: 12, scale: 2 }).notNull().default("0"),
    promotionSummary: varchar("promotionSummary", { length: 500 }),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    amountReceived: decimal("amountReceived", { precision: 12, scale: 2 }),
    changeAmount: decimal("changeAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentProofKey: varchar("paymentProofKey", { length: 320 }),
    paymentProofUrl: varchar("paymentProofUrl", { length: 500 }),
    paymentProofMimeType: varchar("paymentProofMimeType", { length: 80 }),
    paidAt: timestamp("paidAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("transactions_paid_at_idx").on(table.paidAt),
    index("transactions_cashier_idx").on(table.cashierId),
    index("transactions_payment_idx").on(table.paymentMethod),
    index("transactions_tenant_branch_paid_idx").on(table.tenantId, table.branchId, table.paidAt),
  ],
);

export const salesTransactionItems = mysqlTable(
  "salesTransactionItems",
  {
    id: int("id").autoincrement().primaryKey(),
    transactionId: int("transactionId").notNull(),
    productId: int("productId").notNull(),
    productName: varchar("productName", { length: 160 }).notNull(),
    quantity: int("quantity").notNull(),
    unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
    unitCost: decimal("unitCost", { precision: 12, scale: 2 }).notNull(),
    lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull().default("0"),
    lineProfit: decimal("lineProfit", { precision: 12, scale: 2 }).notNull(),
  },
  table => [index("transaction_items_transaction_idx").on(table.transactionId), index("transaction_items_product_idx").on(table.productId)],
);

export const stockMovements = mysqlTable(
  "stockMovements",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    transactionId: int("transactionId"),
    tenantId: int("tenantId"),
    branchId: int("branchId"),
    type: mysqlEnum("type", ["initial", "sale", "adjustment", "restock"]).notNull(),
    quantity: int("quantity").notNull(),
    previousStock: int("previousStock").notNull(),
    resultingStock: int("resultingStock").notNull(),
    note: varchar("note", { length: 255 }),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("stock_movements_product_idx").on(table.productId), index("stock_movements_created_at_idx").on(table.createdAt), index("stock_movements_tenant_branch_idx").on(table.tenantId, table.branchId)],
);

export const productLifecycleEvents = mysqlTable(
  "productLifecycleEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    productName: varchar("productName", { length: 160 }).notNull(),
    productQrCode: varchar("productQrCode", { length: 96 }).notNull(),
    action: mysqlEnum("action", ["archived", "restored", "deleted"]).notNull(),
    stockAtAction: int("stockAtAction").notNull(),
    tenantId: int("tenantId").notNull(),
    branchId: int("branchId").notNull(),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("product_lifecycle_tenant_branch_idx").on(table.tenantId, table.branchId, table.createdAt), index("product_lifecycle_product_idx").on(table.productId)],
);

export const storeSettings = mysqlTable("storeSettings", {
  id: int("id").primaryKey(),
  storeName: varchar("storeName", { length: 120 }).notNull().default("Jajananku"),
  qrisReference: varchar("qrisReference", { length: 160 }),
  receiptFooter: varchar("receiptFooter", { length: 255 }).default("Terima kasih sudah berbelanja."),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tenantReceiptSettings = mysqlTable("tenantReceiptSettings", {
  tenantId: int("tenantId").primaryKey(),
  template: mysqlEnum("template", ["simple", "standard", "complete"]).notNull().default("standard"),
  paperWidth: mysqlEnum("paperWidth", ["58", "70"]).notNull().default("58"),
  autoPrint: mysqlEnum("autoPrint", ["yes", "no"]).notNull().default("no"),
  receiptFooter: varchar("receiptFooter", { length: 255 }).notNull().default("Terima kasih sudah berbelanja."),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
