import { describe, expect, it, vi } from "vitest";

const { getTenantScope, setTenantSubscription, createCashierAccount, createTenantAdminAccount, deleteTenant, deleteTenantAdminAccount, reassignCashierBranch, updateTenantAdminAccount, updateTenantName, listTransactions, listPlatformUsers, listPlatformUserOptions, createPlatformUser, updatePlatformUser, deletePlatformUserAccess, createProduct, listActiveProducts, listStockMovements, getFinanceReport, getPlatformStatistics, archiveProduct, restoreProduct, deleteProductPermanently, listArchivedProducts, listProductLifecycleEvents } = vi.hoisted(() => ({ getTenantScope: vi.fn(), setTenantSubscription: vi.fn(), createCashierAccount: vi.fn(), createTenantAdminAccount: vi.fn(), deleteTenant: vi.fn(), deleteTenantAdminAccount: vi.fn(), reassignCashierBranch: vi.fn(), updateTenantAdminAccount: vi.fn(), updateTenantName: vi.fn(), listTransactions: vi.fn(), listPlatformUsers: vi.fn(), listPlatformUserOptions: vi.fn(), createPlatformUser: vi.fn(), updatePlatformUser: vi.fn(), deletePlatformUserAccess: vi.fn(), createProduct: vi.fn(), listActiveProducts: vi.fn(), listStockMovements: vi.fn(), getFinanceReport: vi.fn(), getPlatformStatistics: vi.fn(), archiveProduct: vi.fn(), restoreProduct: vi.fn(), deleteProductPermanently: vi.fn(), listArchivedProducts: vi.fn(), listProductLifecycleEvents: vi.fn() }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), getTenantScope, setTenantSubscription, createCashierAccount, createTenantAdminAccount, deleteTenant, deleteTenantAdminAccount, reassignCashierBranch, updateTenantAdminAccount, updateTenantName, listTransactions, listPlatformUsers, listPlatformUserOptions, createPlatformUser, updatePlatformUser, deletePlatformUserAccess, createProduct, listActiveProducts, listStockMovements, getFinanceReport, getPlatformStatistics, archiveProduct, restoreProduct, deleteProductPermanently, listArchivedProducts, listProductLifecycleEvents }));

import { appRouter } from "./routers";

describe("router paket dan akun kasir", () => {
  it("menyediakan statistik tenant dan pengguna hanya untuk Superadmin", async () => {
    const statistics = { tenants: { total: 5, active: 4, trial: 2, suspended: 1 }, users: { total: 8, active: 6, superadmin: 1, adminUtama: 2, adminCabang: 1, kasir: 2 } };
    getPlatformStatistics.mockResolvedValue(statistics);
    const superadmin = appRouter.createCaller({ user: { id: 1, role: "superadmin" } } as any);
    await expect(superadmin.superadmin.statistics()).resolves.toEqual(statistics);
    expect(getPlatformStatistics).toHaveBeenCalledTimes(1);
    const tenantAdmin = appRouter.createCaller({ user: { id: 2, role: "admin" } } as any);
    await expect(tenantAdmin.superadmin.statistics()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("meneruskan paket pilihan superadmin hanya ke tenant target", async () => {
    setTenantSubscription.mockResolvedValue({ planId: 7, planName: "Silver 3 Bulan", branchLimit: 5, cashierLimit: 10, endsAt: new Date() });
    const caller = appRouter.createCaller({ user: { id: 1, role: "superadmin" } } as any);
    await caller.superadmin.accounts.setSubscription({ tenantId: 88, planId: 7 });
    expect(setTenantSubscription).toHaveBeenCalledWith(88, { planId: 7, createdBy: 1 });
  });

  it("membuat kasir melalui ruang Admin Utama yang memuat kuota paket tenant", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Utama", membershipRole: "tenant_admin", isTenantAdmin: true, isBranchAdmin: false, onboardingStatus: "complete", branches: [{ id: 10, name: "Utama", code: "UTAMA", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver 3 Bulan", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 1, activeCashiers: 0 } } as const;
    getTenantScope.mockResolvedValue(scope);
    createCashierAccount.mockResolvedValue({ id: 50, name: "Rina", email: "rina@toko.id", branchId: 10, role: "cashier" });
    const caller = appRouter.createCaller({ user: { id: 9, role: "admin" } } as any);
    const input = { name: "Rina", email: "rina@toko.id", password: "KasirAman123", branchId: 10 };
    await caller.team.createCashier(input);
    expect(createCashierAccount).toHaveBeenCalledWith(scope, input);
  });

  it("menolak Admin Cabang dari POS tetapi mengizinkan riwayat cabangnya", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Utama", membershipRole: "branch_admin", isTenantAdmin: false, isBranchAdmin: true, onboardingStatus: "complete", branches: [{ id: 10, name: "Utama", code: "UTAMA", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver 3 Bulan", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 1, activeCashiers: 0 } };
    getTenantScope.mockResolvedValue(scope);
    listTransactions.mockResolvedValue([]);
    const caller = appRouter.createCaller({ user: { id: 12, role: "admin" } } as any);
    await expect(caller.products.active()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await caller.analytics.transactions({ branchId: null });
    expect(listTransactions).toHaveBeenCalledWith(scope, null);
  });

  it("memberi Superadmin CRUD seluruh pengguna selain akun Superadmin", async () => {
    listPlatformUsers.mockResolvedValue([{ id: 2, role: "admin", membershipRole: "tenant_admin" }]);
    listPlatformUserOptions.mockResolvedValue([{ id: 88, name: "Toko A", branches: [{ id: 10, name: "Pusat" }] }]);
    createPlatformUser.mockResolvedValue({ id: 90, passwordChangeRequired: true });
    updatePlatformUser.mockResolvedValue({ success: true });
    deletePlatformUserAccess.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller({ user: { id: 1, role: "superadmin" } } as any);
    await caller.superadmin.users.list();
    await caller.superadmin.users.options();
    const createInput = { name: "Admin Cabang", email: "cabang@toko.id", password: "AwalAman123", tenantId: 88, branchId: 10, membershipRole: "branch_admin" as const };
    await caller.superadmin.users.create(createInput);
    expect(createPlatformUser).toHaveBeenCalledWith(createInput);
    await caller.superadmin.users.update({ userId: 2, name: "Admin Utama", email: "admin@toko.id", status: "active" });
    await caller.superadmin.users.deleteAccess({ userId: 2 });
    expect(updatePlatformUser).toHaveBeenCalledWith(2, { userId: 2, name: "Admin Utama", email: "admin@toko.id", status: "active" });
    expect(deletePlatformUserAccess).toHaveBeenCalledWith(2);
  });

  it("memberi Admin Cabang CRUD produk hanya dengan scope cabangnya", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Cabang A", membershipRole: "branch_admin", isTenantAdmin: false, isBranchAdmin: true, onboardingStatus: "complete", branches: [{ id: 10, name: "Cabang A", code: "A", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } };
    getTenantScope.mockResolvedValue(scope);
    createProduct.mockResolvedValue({ id: 60, qrCode: "JJN-CABANG" });
    const caller = appRouter.createCaller({ user: { id: 12, role: "admin" } } as any);
    const input = { name: "Produk Cabang", salePrice: 10000, costPrice: 5000, stock: 12, lowStockThreshold: 3 };
    await caller.products.create(input);
    expect(createProduct).toHaveBeenCalledWith({ ...input, category: "Lainnya" }, 12, scope);
  });

  it("mengizinkan Admin Cabang melihat, mengarsipkan, dan memulihkan produknya sendiri tanpa hak hapus", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Cabang A", membershipRole: "branch_admin", isTenantAdmin: false, isBranchAdmin: true, onboardingStatus: "complete", branches: [{ id: 10, name: "Cabang A", code: "A", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } } as const;
    getTenantScope.mockResolvedValue(scope);
    listArchivedProducts.mockResolvedValue([]);
    listProductLifecycleEvents.mockResolvedValue([]);
    const caller = appRouter.createCaller({ user: { id: 12, role: "admin" } } as any);
    await caller.products.archived({ branchId: 10 });
    await caller.products.lifecycle({ branchId: 10 });
    await caller.products.archive({ id: 61, branchId: 10 });
    await caller.products.restore({ id: 61, branchId: 10 });
    expect(archiveProduct).toHaveBeenCalledWith(61, 12, scope, 10);
    expect(restoreProduct).toHaveBeenCalledWith(61, 12, scope, 10);
    expect(listArchivedProducts).toHaveBeenCalledWith(scope, 10);
    expect(listProductLifecycleEvents).toHaveBeenCalledWith(scope, 10);
    await expect(caller.products.delete({ id: 61, branchId: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("mengizinkan hanya Admin Utama menghapus permanen produk dari cabang yang dipilih", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Pusat", membershipRole: "tenant_admin", isTenantAdmin: true, isBranchAdmin: false, onboardingStatus: "complete", branches: [{ id: 10, name: "Pusat", code: "P", address: null, status: "active" }, { id: 11, name: "Timur", code: "T", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } } as const;
    getTenantScope.mockResolvedValue(scope);
    const caller = appRouter.createCaller({ user: { id: 9, role: "admin" } } as any);
    await caller.products.delete({ id: 61, branchId: 11 });
    expect(deleteProductPermanently).toHaveBeenCalledWith(61, 9, scope, 11);
  });

  it("meneruskan riwayat stok pada cabang yang diizinkan", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Cabang A", membershipRole: "branch_admin", isTenantAdmin: false, isBranchAdmin: true, onboardingStatus: "complete", branches: [{ id: 10, name: "Cabang A", code: "A", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } };
    getTenantScope.mockResolvedValue(scope);
    listStockMovements.mockResolvedValue([]);
    const caller = appRouter.createCaller({ user: { id: 12, role: "admin" } } as any);
    await caller.stock.history({ branchId: 10 });
    expect(listStockMovements).toHaveBeenCalledWith(scope, 10);
  });

  it("membatasi Kasir pada POS dan menolak akses laporan", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Cabang A", membershipRole: "cashier", isTenantAdmin: false, isBranchAdmin: false, onboardingStatus: "complete", branches: [{ id: 10, name: "Cabang A", code: "A", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } };
    getTenantScope.mockResolvedValue(scope);
    listActiveProducts.mockResolvedValue([]);
    const caller = appRouter.createCaller({ user: { id: 13, role: "cashier" } } as any);
    await caller.products.active();
    expect(listActiveProducts).toHaveBeenCalledWith(scope);
    await expect(caller.analytics.transactions({ branchId: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("memberi Admin Utama laporan gabungan seluruh cabang", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Pusat", membershipRole: "tenant_admin", isTenantAdmin: true, isBranchAdmin: false, onboardingStatus: "complete", branches: [{ id: 10, name: "Pusat", code: "P", address: null, status: "active" }, { id: 11, name: "Cabang", code: "C", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } };
    getTenantScope.mockResolvedValue(scope);
    getFinanceReport.mockResolvedValue({ revenue: 0, cost: 0, profit: 0, transactions: 0, paymentBreakdown: { cash: 0, qris: 0 } });
    const caller = appRouter.createCaller({ user: { id: 9, role: "admin" } } as any);
    const input = { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z", branchId: null };
    await caller.analytics.finance(input);
    expect(getFinanceReport).toHaveBeenCalledWith(new Date(input.from), new Date(input.to), scope, null);
  });

  it("memungkinkan Superadmin membuat Admin Utama dan menghapus usaha terkonfirmasi", async () => {
    createTenantAdminAccount.mockResolvedValue({ id: 45, email: "admin@tokoa.id", passwordChangeRequired: true });
    deleteTenant.mockResolvedValue({ deletedTenantName: "Toko A", removedUsers: 1 });
    const caller = appRouter.createCaller({ user: { id: 1, role: "superadmin" } } as any);
    await caller.superadmin.createAdmin({ tenantId: 88, name: "Dina", email: "admin@tokoa.id", initialPassword: "AwalAman123" });
    expect(createTenantAdminAccount).toHaveBeenCalledWith(88, { name: "Dina", email: "admin@tokoa.id", password: "AwalAman123" });
    await caller.superadmin.deleteTenant({ tenantId: 88, confirmationName: "Toko A" });
    expect(deleteTenant).toHaveBeenCalledWith(88, "Toko A");
  });

  it("memungkinkan Superadmin mengubah usaha dan mengelola Admin Utama pada usaha target", async () => {
    updateTenantName.mockResolvedValue({ success: true });
    updateTenantAdminAccount.mockResolvedValue({ success: true });
    deleteTenantAdminAccount.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller({ user: { id: 1, role: "superadmin" } } as any);
    await caller.superadmin.updateTenant({ tenantId: 88, name: "Toko A Baru" });
    expect(updateTenantName).toHaveBeenCalledWith(88, "Toko A Baru");
    await caller.superadmin.updateAdmin({ tenantId: 88, userId: 45, name: "Dina Baru", email: "dina@tokoa.id" });
    expect(updateTenantAdminAccount).toHaveBeenCalledWith(88, 45, { tenantId: 88, userId: 45, name: "Dina Baru", email: "dina@tokoa.id" });
    await caller.superadmin.deleteAdmin({ tenantId: 88, userId: 45 });
    expect(deleteTenantAdminAccount).toHaveBeenCalledWith(88, 45);
  });

  it("memungkinkan Admin Utama memindahkan Kasir ke cabang aktif dalam usahanya", async () => {
    const scope = { tenantId: 88, tenantName: "Toko A", branchId: 10, branchName: "Utama", membershipRole: "tenant_admin", isTenantAdmin: true, isBranchAdmin: false, onboardingStatus: "complete", branches: [{ id: 10, name: "Utama", code: "UTAMA", address: null, status: "active" }, { id: 11, name: "Timur", code: "TIMUR", address: null, status: "active" }], subscription: { allowed: true, state: "active", daysRemaining: 30, planId: 7, planName: "Silver 3 Bulan", tier: "silver", branchLimit: 5, cashierLimit: 10, activeBranches: 2, activeCashiers: 1 } } as const;
    getTenantScope.mockResolvedValue(scope);
    reassignCashierBranch.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller({ user: { id: 9, role: "admin" } } as any);
    await caller.team.reassignCashierBranch({ memberId: 70, branchId: 11 });
    expect(reassignCashierBranch).toHaveBeenCalledWith(scope, 70, 11);
  });
});
