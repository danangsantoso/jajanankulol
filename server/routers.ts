import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  adjustProductStock,
  archiveBranch,
  archiveProduct,
  deleteProductPermanently,
  authenticatePasswordLogin,
  changeRequiredPassword,
  checkoutSale,
  createBranch,
  createBranchAdminAccount,
  createCashierAccount,
  createTenantAdminAccount,
  createProduct,
  createTenant,
  deactivateTenantMember,
  deleteTenant,
  deleteTenantAdminAccount,
  deleteSubscriptionPlan,
  deletePromotion,
  getDashboardData,
  getFinanceReport,
  getOnboardingProfile,
  getPlatformSettings,
  getTenantReceiptSettings,
  getTransactionReceipt,
  getProductByQr,
  getTenantScope,
  inviteCashier,
  inviteTenantAdmin,
  listActiveProducts,
  listAllProducts,
  listArchivedProducts,
  listProductLifecycleEvents,
  listBranches,
  listStockMovements,
  listSubscriptionPlans,
  listTenantMembers,
  listTenants,
  listTransactions,
  getPlatformStatistics,
  listPlatformUsers,
  listPlatformUserOptions,
  createPlatformUser,
  listPromotions,
  setActiveBranch,
  restoreProduct,
  setTenantStatus,
  setTenantSubscription,
  setUserAccountStatus,
  resetUserPassword,
  resetTenantMemberPassword,
  reassignCashierBranch,
  saveSubscriptionPlan,
  savePromotion,
  completeTenantOnboarding,
  updateTenantBusinessProfile,
  updateTenantBusinessLogo,
  updateTenantReceiptSettings,
  updatePlatformSettings,
  updateTenantAdminAccount,
  updateTenantName,
  updatePlatformUser,
  deletePlatformUserAccess,
  updateProduct,
  quotePromotions,
} from "./db";
import { sdk } from "./_core/sdk";
import { saveProductImage } from "./productImageUpload";
import { saveBusinessLogo } from "./businessLogoUpload";

const passwordReadyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.passwordChangeRequired === "yes") throw new TRPCError({ code: "FORBIDDEN", message: "Ganti kata sandi awal Anda sebelum melanjutkan." });
  return next({ ctx });
});

const superadminProcedure = passwordReadyProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN", message: "Akses ini khusus superadmin." });
  return next({ ctx });
});

const scopedProcedure = passwordReadyProcedure.use(async ({ ctx, next }) => {
  try {
    const scope = await getTenantScope(ctx.user.id);
    return next({ ctx: { ...ctx, scope } });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Akun belum memiliki akses tenant." });
  }
});

const subscriptionProcedure = scopedProcedure.use(({ ctx, next }) => {
  if (!ctx.scope.subscription.allowed) throw new TRPCError({ code: "FORBIDDEN", message: ctx.scope.subscription.message || "Akses langganan tidak aktif." });
  return next({ ctx });
});
const cashierProcedure = subscriptionProcedure.use(({ ctx, next }) => {
  if (ctx.scope.membershipRole !== "cashier") throw new TRPCError({ code: "FORBIDDEN", message: "Akses kasir hanya tersedia untuk role Kasir." });
  return next({ ctx });
});
const tenantAdminProcedure = subscriptionProcedure.use(({ ctx, next }) => {
  if (!ctx.scope.isTenantAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Akses ini khusus admin tenant." });
  return next({ ctx });
});
const branchManagerProcedure = subscriptionProcedure.use(({ ctx, next }) => {
  if (!ctx.scope.isTenantAdmin && !ctx.scope.isBranchAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Akses ini khusus admin utama atau admin cabang." });
  return next({ ctx });
});
const tenantAdminScopeProcedure = scopedProcedure.use(({ ctx, next }) => {
  if (!ctx.scope.isTenantAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Akses ini khusus admin tenant." });
  return next({ ctx });
});

const productInput = z.object({
  name: z.string().trim().min(2, "Nama produk minimal 2 karakter.").max(160),
  category: z.string().trim().min(2, "Kategori produk minimal 2 karakter.").max(80).default("Lainnya"),
  imageKey: z.string().trim().min(12).max(255).nullable().optional(),
  imageUrl: z.string().trim().startsWith("/manus-storage/").max(512).nullable().optional(),
  salePrice: z.number().int().positive("Harga jual harus lebih dari nol."),
  costPrice: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).max(9999),
  branchId: z.number().int().positive().optional(),
});

const promotionItemsInput = z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1).max(20).refine(items => new Set(items.map(item => item.productId)).size === items.length, "Produk promo tidak boleh dipilih dua kali.");
const promotionInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2, "Nama promo minimal 2 karakter.").max(160),
  type: z.enum(["discount", "bundle"]),
  status: z.enum(["active", "inactive"]),
  discountType: z.enum(["percentage", "fixed"]).nullable().optional(),
  discountValue: z.number().int().min(1).max(1000000).nullable().optional(),
  bundlePrice: z.number().int().min(1).max(100000000).nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  branchId: z.number().int().positive().optional(),
  items: promotionItemsInput,
}).superRefine((value, ctx) => {
  if (value.endsAt <= value.startsAt) ctx.addIssue({ code: "custom", message: "Waktu berakhir harus setelah waktu mulai.", path: ["endsAt"] });
  if (value.type === "discount" && (!value.discountType || !value.discountValue)) ctx.addIssue({ code: "custom", message: "Lengkapi jenis dan nilai diskon.", path: ["discountValue"] });
  if (value.type === "discount" && value.discountType === "percentage" && (value.discountValue || 0) > 100) ctx.addIssue({ code: "custom", message: "Diskon persentase maksimal 100%.", path: ["discountValue"] });
  if (value.type === "bundle" && value.items.length < 2) ctx.addIssue({ code: "custom", message: "Bundling minimal berisi dua produk.", path: ["items"] });
  if (value.type === "bundle" && !value.bundlePrice) ctx.addIssue({ code: "custom", message: "Masukkan harga bundling.", path: ["bundlePrice"] });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ?? null),
    loginPassword: publicProcedure.input(z.object({ email: z.string().trim().email(), password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await authenticatePasswordLogin(input.email, input.password);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email, kata sandi, atau status akun tidak sesuai." });
      const token = await sdk.createSessionToken(user.openId, { name: user.name || "Pengguna Jajananku", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      return { user, redirectPath: user.passwordChangeRequired === "yes" ? "/ganti-password" : user.role === "superadmin" ? "/superadmin" : user.role === "cashier" ? "/pos" : "/dashboard" };
    }),
    changeRequiredPassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(8).max(128) })).mutation(({ ctx, input }) => changeRequiredPassword(ctx.user.id, input.currentPassword, input.newPassword)),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  platform: router({
    publicSettings: publicProcedure.query(() => getPlatformSettings()),
    plans: publicProcedure.query(() => listSubscriptionPlans()),
  }),
  onboarding: router({
    profile: passwordReadyProcedure.query(({ ctx }) => getOnboardingProfile(ctx.user.id)),
    complete: passwordReadyProcedure.input(z.object({
      businessName: z.string().trim().min(2).max(160),
      ownerName: z.string().trim().min(2).max(160),
      whatsappNumber: z.string().trim().regex(/^\d{8,24}$/, "Gunakan angka WhatsApp tanpa tanda + atau spasi."),
      address: z.string().trim().min(5).max(255),
      description: z.string().trim().max(1000).nullable().optional(),
    })).mutation(({ ctx, input }) => completeTenantOnboarding(ctx.user.id, input)),
  }),
  businessProfile: router({
    get: tenantAdminScopeProcedure.query(({ ctx }) => getOnboardingProfile(ctx.user.id)),
    update: tenantAdminScopeProcedure.input(z.object({
      businessName: z.string().trim().min(2).max(160),
      ownerName: z.string().trim().min(2).max(160),
      whatsappNumber: z.string().trim().regex(/^\d{8,24}$/, "Gunakan angka WhatsApp tanpa tanda + atau spasi."),
      address: z.string().trim().min(5).max(255),
      description: z.string().trim().max(1000).nullable().optional(),
    })).mutation(({ ctx, input }) => updateTenantBusinessProfile(ctx.user.id, input)),
  }),
  productImages: router({
    upload: tenantAdminProcedure.input(z.object({ dataUrl: z.string().min(32).max(1_600_000) })).mutation(({ ctx, input }) => saveProductImage(input.dataUrl, ctx.user.id, ctx.scope.tenantId)),
  }),
  businessLogo: router({
    upload: tenantAdminProcedure.input(z.object({ dataUrl: z.string().min(32).max(1_600_000) })).mutation(async ({ ctx, input }) => {
      const logo = await saveBusinessLogo(input.dataUrl, ctx.user.id, ctx.scope.tenantId);
      await updateTenantBusinessLogo(ctx.scope, { logoKey: logo.key, logoUrl: logo.url });
      return logo;
    }),
    remove: tenantAdminProcedure.mutation(({ ctx }) => updateTenantBusinessLogo(ctx.scope, { logoKey: null, logoUrl: null })),
  }),
  receiptSettings: router({
    get: subscriptionProcedure.query(({ ctx }) => getTenantReceiptSettings(ctx.scope)),
    update: tenantAdminProcedure.input(z.object({
      template: z.enum(["simple", "standard", "complete"]),
      paperWidth: z.enum(["58", "70"]),
      autoPrint: z.enum(["yes", "no"]),
      receiptFooter: z.string().trim().min(2).max(255),
    })).mutation(({ ctx, input }) => updateTenantReceiptSettings(ctx.scope, input)),
  }),
  workspace: router({
    current: scopedProcedure.query(({ ctx }) => ctx.scope),
    switchBranch: scopedProcedure.input(z.object({ branchId: z.number().int().positive() })).mutation(({ ctx, input }) => setActiveBranch(ctx.user.id, ctx.scope, input.branchId)),
  }),
  superadmin: router({
    statistics: superadminProcedure.query(() => getPlatformStatistics()),
    tenants: superadminProcedure.query(() => listTenants()),
    createTenant: superadminProcedure.input(z.object({ name: z.string().trim().min(2).max(160) })).mutation(({ input }) => createTenant(input.name)),
    createAdmin: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), name: z.string().trim().min(2).max(160), email: z.string().trim().email(), initialPassword: z.string().min(8).max(128) })).mutation(({ input }) => createTenantAdminAccount(input.tenantId, { name: input.name, email: input.email, password: input.initialPassword })),
    updateTenant: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), name: z.string().trim().min(2).max(160) })).mutation(({ input }) => updateTenantName(input.tenantId, input.name)),
    updateAdmin: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), userId: z.number().int().positive(), name: z.string().trim().min(2).max(160), email: z.string().trim().email() })).mutation(({ input }) => updateTenantAdminAccount(input.tenantId, input.userId, input)),
    deleteAdmin: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(({ input }) => deleteTenantAdminAccount(input.tenantId, input.userId)),
    deleteTenant: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), confirmationName: z.string().trim().min(2).max(160) })).mutation(({ input }) => deleteTenant(input.tenantId, input.confirmationName)),
    inviteAdmin: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), branchId: z.number().int().positive(), email: z.string().trim().email() })).mutation(({ ctx, input }) => inviteTenantAdmin(input.tenantId, ctx.user.id, input)),
    plans: router({
      list: superadminProcedure.query(() => listSubscriptionPlans(true)),
      save: superadminProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(120), tier: z.enum(["bronze", "silver", "gold", "platinum"]), durationDays: z.number().int().min(1).max(730), branchLimit: z.number().int().min(1).max(999), cashierLimit: z.number().int().min(1).max(9999), regularPrice: z.number().int().min(0), salePrice: z.number().int().min(0).nullable().optional(), isActive: z.enum(["yes", "no"]), availability: z.enum(["available", "coming_soon", "archived"]), sortOrder: z.number().int().min(0).max(9999) })).mutation(({ input }) => saveSubscriptionPlan(input)),
      delete: superadminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteSubscriptionPlan(input.id)),
    }),
    accounts: router({
      setSubscription: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), planId: z.number().int().positive() })).mutation(({ ctx, input }) => setTenantSubscription(input.tenantId, { planId: input.planId, createdBy: ctx.user.id })),
      setTenantStatus: superadminProcedure.input(z.object({ tenantId: z.number().int().positive(), status: z.enum(["active", "suspended"]) })).mutation(({ input }) => setTenantStatus(input.tenantId, input.status)),
      setUserStatus: superadminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(({ input }) => setUserAccountStatus(input.userId, input.status)),
      resetPassword: superadminProcedure.input(z.object({ userId: z.number().int().positive(), newPassword: z.string().min(8).max(128) })).mutation(({ input }) => resetUserPassword(input.userId, input.newPassword)),
    }),
    users: router({
      list: superadminProcedure.query(() => listPlatformUsers()),
      options: superadminProcedure.query(() => listPlatformUserOptions()),
      create: superadminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email(), password: z.string().min(8).max(128), tenantId: z.number().int().positive(), branchId: z.number().int().positive(), membershipRole: z.enum(["tenant_admin", "branch_admin", "cashier"]) })).mutation(({ input }) => createPlatformUser(input)),
      update: superadminProcedure.input(z.object({ userId: z.number().int().positive(), name: z.string().trim().min(2).max(160), email: z.string().trim().email(), status: z.enum(["active", "inactive"]) })).mutation(({ input }) => updatePlatformUser(input.userId, input)),
      deleteAccess: superadminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ input }) => deletePlatformUserAccess(input.userId)),
    }),
    settings: router({
      get: superadminProcedure.query(() => getPlatformSettings()),
      update: superadminProcedure.input(z.object({ whatsappNumber: z.string().trim().regex(/^\d{8,24}$/).nullable().optional(), whatsappMessage: z.string().trim().min(3).max(500).nullable().optional() })).mutation(({ input }) => updatePlatformSettings(input)),
    }),
  }),
  branches: router({
    list: tenantAdminProcedure.query(({ ctx }) => listBranches(ctx.scope)),
    create: tenantAdminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), code: z.string().trim().min(2).max(48), address: z.string().trim().max(255).nullable().optional() })).mutation(({ ctx, input }) => createBranch(ctx.scope, input)),
    archive: tenantAdminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => archiveBranch(ctx.scope, input.id)),
  }),
  team: router({
    list: tenantAdminProcedure.query(({ ctx }) => listTenantMembers(ctx.scope)),
    inviteCashier: tenantAdminProcedure.input(z.object({ email: z.string().trim().email(), branchId: z.number().int().positive() })).mutation(({ ctx, input }) => inviteCashier(ctx.scope, ctx.user.id, input)),
    createCashier: tenantAdminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email(), password: z.string().min(8).max(128), branchId: z.number().int().positive() })).mutation(({ ctx, input }) => createCashierAccount(ctx.scope, input)),
    createBranchAdmin: tenantAdminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email(), password: z.string().min(8).max(128), branchId: z.number().int().positive() })).mutation(({ ctx, input }) => createBranchAdminAccount(ctx.scope, input)),
    resetMemberPassword: tenantAdminProcedure.input(z.object({ memberId: z.number().int().positive(), newPassword: z.string().min(8).max(128) })).mutation(({ ctx, input }) => resetTenantMemberPassword(ctx.scope, input.memberId, input.newPassword)),
    reassignCashierBranch: tenantAdminProcedure.input(z.object({ memberId: z.number().int().positive(), branchId: z.number().int().positive() })).mutation(({ ctx, input }) => reassignCashierBranch(ctx.scope, input.memberId, input.branchId)),
    deactivate: tenantAdminProcedure.input(z.object({ memberId: z.number().int().positive() })).mutation(({ ctx, input }) => deactivateTenantMember(ctx.scope, input.memberId)),
  }),
  stock: router({
    history: branchManagerProcedure.input(z.object({ branchId: z.number().int().positive().optional() })).query(({ ctx, input }) => listStockMovements(ctx.scope, input.branchId)),
  }),
  promotions: router({
    list: tenantAdminProcedure.input(z.object({ branchId: z.number().int().positive().optional() })).query(({ ctx, input }) => listPromotions(ctx.scope, input.branchId)),
    save: tenantAdminProcedure.input(promotionInput).mutation(({ ctx, input }) => savePromotion(ctx.scope, ctx.user.id, input)),
    delete: tenantAdminProcedure.input(z.object({ id: z.number().int().positive(), branchId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => deletePromotion(ctx.scope, input.id, input.branchId)),
    quote: cashierProcedure.input(z.object({ items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99), unitPrice: z.number().int().positive() })).max(99) })).query(({ ctx, input }) => quotePromotions(ctx.scope, input.items)),
  }),
  products: router({
    active: cashierProcedure.query(({ ctx }) => listActiveProducts(ctx.scope)),
    all: branchManagerProcedure.input(z.object({ branchId: z.number().int().positive().optional() })).query(({ ctx, input }) => listAllProducts(ctx.scope, input.branchId)),
    archived: branchManagerProcedure.input(z.object({ branchId: z.number().int().positive().optional() })).query(({ ctx, input }) => listArchivedProducts(ctx.scope, input.branchId)),
    lifecycle: branchManagerProcedure.input(z.object({ branchId: z.number().int().positive().optional() })).query(({ ctx, input }) => listProductLifecycleEvents(ctx.scope, input.branchId)),
    byQr: cashierProcedure.input(z.object({ qrCode: z.string().trim().min(3).max(96) })).query(({ ctx, input }) => getProductByQr(input.qrCode, ctx.scope)),
    create: branchManagerProcedure.input(productInput.extend({ stock: z.number().int().min(0).max(999999) })).mutation(({ ctx, input }) => createProduct(input, ctx.user.id, ctx.scope)),
    update: branchManagerProcedure.input(productInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => {
      const { id, ...payload } = input;
      return updateProduct(id, payload, ctx.scope);
    }),
    archive: branchManagerProcedure.input(z.object({ id: z.number().int().positive(), branchId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => archiveProduct(input.id, ctx.user.id, ctx.scope, input.branchId)),
    restore: branchManagerProcedure.input(z.object({ id: z.number().int().positive(), branchId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => restoreProduct(input.id, ctx.user.id, ctx.scope, input.branchId)),
    delete: tenantAdminProcedure.input(z.object({ id: z.number().int().positive(), branchId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => deleteProductPermanently(input.id, ctx.user.id, ctx.scope, input.branchId)),
    adjustStock: branchManagerProcedure.input(z.object({ id: z.number().int().positive(), delta: z.number().int().refine(value => value !== 0), note: z.string().trim().max(255).optional(), branchId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => adjustProductStock(input.id, input.delta, ctx.user.id, ctx.scope, input.note, input.branchId)),
  }),
  pos: router({
    checkout: cashierProcedure.input(z.object({
      paymentMethod: z.enum(["cash", "qris"]),
      amountReceived: z.number().int().min(0).optional(),
      paymentProofKey: z.string().min(1).max(320).optional(),
      paymentProofUrl: z.string().min(1).max(500).optional(),
      paymentProofMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99) })).min(1),
    })).mutation(({ ctx, input }) => checkoutSale({ ...input, cashierId: ctx.user.id }, ctx.scope)),
  }),
  analytics: router({
    dashboard: branchManagerProcedure.input(z.object({ period: z.enum(["daily", "weekly", "monthly"]).default("daily"), branchId: z.number().int().positive().nullable().optional() })).query(({ ctx, input }) => getDashboardData(input.period, ctx.scope, input.branchId)),
    transactions: branchManagerProcedure.input(z.object({ branchId: z.number().int().positive().nullable().optional() })).query(({ ctx, input }) => listTransactions(ctx.scope, input.branchId)),
    receipt: branchManagerProcedure.input(z.object({ transactionId: z.number().int().positive() })).query(({ ctx, input }) => getTransactionReceipt(ctx.scope, input.transactionId)),
    finance: branchManagerProcedure.input(z.object({ from: z.string().datetime(), to: z.string().datetime(), branchId: z.number().int().positive().nullable().optional() })).query(({ ctx, input }) => getFinanceReport(new Date(input.from), new Date(input.to), ctx.scope, input.branchId)),
  }),
});

export type AppRouter = typeof appRouter;
