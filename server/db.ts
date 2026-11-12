import { and, asc, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  branches,
  InsertUser,
  platformSettings,
  promotionItems,
  productLifecycleEvents,
  promotions,
  products,
  salesTransactionItems,
  salesTransactions,
  stockMovements,
  storeSettings,
  subscriptionPlans,
  tenantReceiptSettings,
  tenantInvitations,
  tenantMembers,
  tenantSubscriptions,
  tenants,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DashboardPeriod, getDashboardPeriodRange, summarizeDashboardSales } from "./dashboardPeriod";
import { calculateChange, calculateCheckout, calculateFinanceSummary, calculateNextStock, requireQrisProof } from "./pos";
import { canAccessBranch, resolvePermittedBranchIds } from "./tenantAccess";
import { filterRecordsToScope } from "./tenantIsolation";
import { canDeactivateMember, resolveInvitationClaim } from "./tenantInvitationLifecycle";
import { addSubscriptionDays, getSubscriptionAccess, trialEndsFrom } from "./subscriptionAccess";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { buildOnboardingTenantUpdate } from "./onboardingProfile";
import { canCreateBranchForPackage, packageBranchLimitMessage } from "./branchLimit";
import { DEFAULT_PACKAGE_CATALOG, PackageTier } from "./packageCatalog";
import { assertCashierQuota, buildPackageAssignment, resolveReportingBranchId } from "./packagePolicy";
import { initialTenantMembershipRole, shouldCreateInitialTenant } from "./tenantBootstrap";
import { summarizePlatformStats } from "./platformStats";
import { calculatePromotionPricing, type PromotionCartLine, type PromotionRule } from "./promotionPricing";
import { resolveGoogleEmailIdentity } from "./accountIdentity";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export type TenantScope = {
  tenantId: number;
  tenantName: string;
  branchId: number;
  branchName: string;
  membershipRole: "tenant_admin" | "branch_admin" | "cashier";
  isTenantAdmin: boolean;
  isBranchAdmin: boolean;
  onboardingStatus: "pending" | "complete";
  branches: Array<{ id: number; name: string; code: string; address: string | null; status: "active" | "archived" }>;
  subscription: ReturnType<typeof getSubscriptionAccess> & { planId: number | null; planName: string; tier: "bronze" | "silver" | "gold" | "platinum"; branchLimit: number; cashierLimit: number; activeBranches: number; activeCashiers: number };
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || undefined;
}

function makeSlug(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96) || "usaha";
  return `${base}-${nanoid(5).toLowerCase()}`;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const isOwner = user.openId === ENV.ownerOpenId;
  const normalizedEmail = normalizeEmail(user.email);
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date(), role: isOwner ? "superadmin" : user.role ?? "admin", status: "active" };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date(), ...(isOwner ? { role: "superadmin" } : {}) };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      const value = field === "email" ? normalizedEmail ?? null : user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  }
  const matchingEmailUser = normalizedEmail
    ? (await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1))[0]
    : undefined;
  const resolvedOpenId = matchingEmailUser?.openId ?? user.openId;
  if (matchingEmailUser && matchingEmailUser.openId !== user.openId) {
    await db.update(users).set(updateSet).where(eq(users.id, matchingEmailUser.id));
  } else {
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  }

  const storedUser = (await db.select().from(users).where(eq(users.openId, resolvedOpenId)).limit(1))[0];
  const email = normalizeEmail(storedUser?.email);
  if (!storedUser || !email) return;

  const invitations = await db.select().from(tenantInvitations).where(and(eq(tenantInvitations.email, email), eq(tenantInvitations.status, "pending")));
  for (const invitation of invitations) {
    const claim = resolveInvitationClaim(invitation, email);
    if (!claim.shouldClaim) continue;
    await db.insert(tenantMembers).values({ tenantId: invitation.tenantId, userId: storedUser.id, branchId: claim.membershipBranchId, role: claim.membershipRole, status: "active" }).onDuplicateKeyUpdate({ set: { branchId: claim.membershipBranchId, role: claim.membershipRole, status: "active" } });
    await db.update(tenantInvitations).set({ status: "claimed", claimedAt: new Date() }).where(eq(tenantInvitations.id, invitation.id));
    if (!storedUser.activeBranchId) await db.update(users).set({ activeBranchId: invitation.branchId }).where(eq(users.id, storedUser.id));
  }

  const memberships = await db.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.userId, storedUser.id), eq(tenantMembers.status, "active"))).limit(1);
  if (shouldCreateInitialTenant(isOwner, Boolean(memberships[0]))) {
      const created = await createTenant(storedUser.name?.trim() ? `Usaha ${storedUser.name.trim()}` : `Usaha ${email.split("@")[0]}`);
      await db.insert(tenantMembers).values({ tenantId: created.tenantId, userId: storedUser.id, branchId: created.branchId, role: initialTenantMembershipRole(), status: "active" });
      await db.update(users).set({ role: "admin", activeBranchId: created.branchId, status: "active" }).where(eq(users.id, storedUser.id));
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function upsertGoogleAdmin(input: { subject: string; email: string; name: string }) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email Google tidak valid.");
  const openId = `google_${input.subject}`.slice(0, 64);
  await upsertUser({ openId, name: input.name, email, loginMethod: "google", role: "admin", lastSignedIn: new Date() });
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user) throw new Error("Akun Google tidak dapat dibuat.");
  resolveGoogleEmailIdentity(user, input.subject);
  await db.update(users).set({ googleSubject: input.subject, status: "active", loginMethod: "google", lastSignedIn: new Date() }).where(eq(users.id, user.id));
  const updatedUser = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
  if (!updatedUser) throw new Error("Akun Google tidak dapat diperbarui.");
  return updatedUser;
}

export async function getTenantScope(userId: number): Promise<TenantScope> {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (user?.status !== "active") throw new Error("Akun pengguna dinonaktifkan. Hubungi admin Jajananku.");
  const memberships = await db
    .select({ tenantId: tenantMembers.tenantId, role: tenantMembers.role, tenantName: tenants.name, tenantStatus: tenants.status, subscriptionStatus: tenants.subscriptionStatus, trialEndsAt: tenants.trialEndsAt, subscriptionEndsAt: tenants.subscriptionEndsAt, onboardingStatus: tenants.onboardingStatus, activePlanId: tenants.activePlanId })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.status, "active")));
  const membership = memberships[0];
  if (!membership) throw new Error("Akun ini belum menjadi anggota tenant aktif.");
  const subscriptionAccess = getSubscriptionAccess({ status: membership.tenantStatus === "suspended" ? "suspended" : membership.subscriptionStatus, trialEndsAt: membership.trialEndsAt, subscriptionEndsAt: membership.subscriptionEndsAt });
  const activePlan = membership.activePlanId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, membership.activePlanId)).limit(1))[0] : undefined;

  const availableBranches = await db.select().from(branches).where(and(eq(branches.tenantId, membership.tenantId), eq(branches.status, "active"))).orderBy(asc(branches.name));
  const activeCashiers = await db.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.tenantId, membership.tenantId), eq(tenantMembers.role, "cashier"), eq(tenantMembers.status, "active")));
  const assignedMembership = (await db.select({ branchId: tenantMembers.branchId }).from(tenantMembers).where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, membership.tenantId))).limit(1))[0];
  const permittedIds = resolvePermittedBranchIds(membership.role, assignedMembership?.branchId, availableBranches.map(branch => branch.id));
  const permittedBranches = availableBranches.filter(branch => permittedIds.includes(branch.id));
  const activeBranch = permittedBranches.find(branch => branch.id === user?.activeBranchId) || permittedBranches[0];
  if (!activeBranch) throw new Error("Tidak ada cabang aktif yang ditugaskan ke akun ini.");
  if (user?.activeBranchId !== activeBranch.id) await db.update(users).set({ activeBranchId: activeBranch.id }).where(eq(users.id, userId));
  return {
    tenantId: membership.tenantId,
    tenantName: membership.tenantName,
    branchId: activeBranch.id,
    branchName: activeBranch.name,
    membershipRole: membership.role,
    isTenantAdmin: membership.role === "tenant_admin",
    isBranchAdmin: membership.role === "branch_admin",
    onboardingStatus: membership.onboardingStatus,
    branches: permittedBranches.map(branch => ({ id: branch.id, name: branch.name, code: branch.code, address: branch.address, status: branch.status })),
    subscription: { ...subscriptionAccess, planId: activePlan?.id ?? null, planName: activePlan?.name ?? "Trial Bronze", tier: activePlan?.tier ?? "bronze", branchLimit: activePlan?.branchLimit ?? 2, cashierLimit: activePlan?.cashierLimit ?? 2, activeBranches: availableBranches.length, activeCashiers: activeCashiers.length },
  };
}

export async function getOnboardingProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const scope = await getTenantScope(userId);
  if (!scope.isTenantAdmin) throw new Error("Onboarding usaha hanya tersedia bagi admin usaha.");
  const tenant = (await db.select().from(tenants).where(eq(tenants.id, scope.tenantId)).limit(1))[0];
  const user = (await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!tenant || !user) throw new Error("Profil usaha tidak ditemukan.");
  return { completed: tenant.onboardingStatus === "complete", businessName: tenant.name, ownerName: tenant.ownerName || user.name || "", email: user.email || "", whatsappNumber: tenant.whatsappNumber || "", address: tenant.businessAddress || "", description: tenant.businessDescription || "", logoKey: tenant.logoKey || null, logoUrl: tenant.logoUrl || null, trialEndsAt: tenant.trialEndsAt, subscriptionEndsAt: tenant.subscriptionEndsAt };
}

export async function persistTenantOnboarding(tx: any, input: { tenantId: number; userId: number; branchId: number; businessName: string; ownerName: string; whatsappNumber: string; address: string; description?: string | null }) {
  await tx.update(tenants).set(buildOnboardingTenantUpdate(input)).where(eq(tenants.id, input.tenantId));
  await tx.update(users).set({ name: input.ownerName }).where(eq(users.id, input.userId));
  await tx.update(branches).set({ address: input.address }).where(eq(branches.id, input.branchId));
}

export async function completeTenantOnboarding(userId: number, input: { businessName: string; ownerName: string; whatsappNumber: string; address: string; description?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const scope = await getTenantScope(userId);
  if (!scope.isTenantAdmin) throw new Error("Onboarding usaha hanya tersedia bagi admin usaha.");
  await db.transaction(async tx => persistTenantOnboarding(tx, { ...input, tenantId: scope.tenantId, userId, branchId: scope.branchId }));
  return { redirectPath: "/dashboard" };
}

export async function persistTenantBusinessProfile(tx: any, input: { tenantId: number; userId: number; branchId: number; businessName: string; ownerName: string; whatsappNumber: string; address: string; description?: string | null }) {
  await tx.update(tenants).set({
    name: input.businessName,
    ownerName: input.ownerName,
    whatsappNumber: input.whatsappNumber,
    businessAddress: input.address,
    businessDescription: input.description || null,
  }).where(eq(tenants.id, input.tenantId));
  await tx.update(users).set({ name: input.ownerName }).where(eq(users.id, input.userId));
  await tx.update(branches).set({ address: input.address }).where(eq(branches.id, input.branchId));
}

export async function updateTenantBusinessProfile(userId: number, input: { businessName: string; ownerName: string; whatsappNumber: string; address: string; description?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const scope = await getTenantScope(userId);
  if (!scope.isTenantAdmin) throw new Error("Profil usaha hanya dapat diperbarui oleh admin usaha.");
  await db.transaction(async tx => persistTenantBusinessProfile(tx, { ...input, tenantId: scope.tenantId, userId, branchId: scope.branchId }));
  return getOnboardingProfile(userId);
}

export async function updateTenantBusinessLogo(scope: TenantScope, input: { logoKey: string | null; logoUrl: string | null }) {
  if (!scope.isTenantAdmin) throw new Error("Logo usaha hanya dapat diubah oleh Admin Utama.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(tenants).set(input).where(eq(tenants.id, scope.tenantId));
  return getTenantReceiptSettings(scope);
}

export async function setActiveBranch(userId: number, scope: TenantScope, branchId: number) {
  if (!canAccessBranch(scope.membershipRole, scope.membershipRole === "cashier" ? scope.branchId : null, scope.branches.map(branch => branch.id), branchId)) throw new Error("Anda tidak memiliki akses ke cabang ini.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(users).set({ activeBranchId: branchId }).where(eq(users.id, userId));
}

export async function getPlatformSettings() {
  const db = await getDb();
  if (!db) return { whatsappNumber: null, whatsappMessage: "Halo Jajananku, saya ingin mengetahui solusi POS untuk usaha saya." };
  const settings = (await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1))[0];
  return settings || { whatsappNumber: null, whatsappMessage: "Halo Jajananku, saya ingin mengetahui solusi POS untuk usaha saya." };
}

export async function updatePlatformSettings(input: { whatsappNumber?: string | null; whatsappMessage?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(platformSettings).values({ id: 1, ...input }).onDuplicateKeyUpdate({ set: input });
}

export async function listTenants() {
  const db = await getDb();
  if (!db) return [];
  const tenantRows = await db.select().from(tenants).orderBy(asc(tenants.name));
  const branchRows = await db.select().from(branches).where(eq(branches.status, "active")).orderBy(asc(branches.name));
  const admins = await db.select({ tenantId: tenantMembers.tenantId, adminName: users.name, adminEmail: users.email, adminUserId: users.id }).from(tenantMembers).innerJoin(users, eq(tenantMembers.userId, users.id)).where(and(eq(tenantMembers.role, "tenant_admin"), eq(tenantMembers.status, "active")));
  const planRows = await db.select().from(subscriptionPlans);
  return tenantRows.map(tenant => ({ ...tenant, defaultBranchId: branchRows.find(branch => branch.tenantId === tenant.id)?.id ?? null, admin: admins.find(admin => admin.tenantId === tenant.id) ?? null, activePlan: planRows.find(plan => plan.id === tenant.activePlanId) ?? null }));
}

export async function createTenant(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const slug = makeSlug(name);
  return db.transaction(async tx => {
    const now = new Date();
    const trialEndsAt = trialEndsFrom(now);
    const result = await tx.insert(tenants).values({ name, slug, subscriptionStatus: "trial", trialEndsAt });
    const tenantId = Number(result[0].insertId);
    const branchResult = await tx.insert(branches).values({ tenantId, name: "Cabang Utama", code: "UTAMA" });
    await tx.insert(tenantSubscriptions).values({ tenantId, status: "trial", startsAt: now, endsAt: trialEndsAt, branchLimit: 2, cashierLimit: 2 });
    return { tenantId, branchId: Number(branchResult[0].insertId), slug };
  });
}

export async function listSubscriptionPlans(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  const existing = await db.select().from(subscriptionPlans);
  for (const template of DEFAULT_PACKAGE_CATALOG) {
    const match = existing.find(plan => plan.tier === template.tier && plan.durationDays === template.durationDays);
    const values = { ...template, regularPrice: template.regularPrice.toString(), salePrice: template.salePrice === null ? null : template.salePrice.toString(), isActive: "yes" as const };
    if (!match) await db.insert(subscriptionPlans).values(values);
    else if (match.name.startsWith("Paket ")) await db.update(subscriptionPlans).set(values).where(eq(subscriptionPlans.id, match.id));
  }
  const canonicalIds = new Set(existing.filter(plan => DEFAULT_PACKAGE_CATALOG.some(template => template.tier === plan.tier && template.durationDays === plan.durationDays && !plan.name.startsWith("Paket "))).map(plan => plan.id));
  for (const legacy of existing.filter(plan => plan.name.startsWith("Paket ") && !canonicalIds.has(plan.id))) {
    await db.update(subscriptionPlans).set({ availability: "archived", isActive: "no" }).where(eq(subscriptionPlans.id, legacy.id));
  }
  const rows = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder), asc(subscriptionPlans.durationDays));
  return includeInactive ? rows : rows.filter(plan => plan.isActive === "yes" && plan.availability !== "archived");
}

export async function saveSubscriptionPlan(input: { id?: number; name: string; tier: PackageTier; durationDays: number; branchLimit: number; cashierLimit: number; regularPrice: number; salePrice?: number | null; isActive: "yes" | "no"; availability: "available" | "coming_soon" | "archived"; sortOrder: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const values = { name: input.name, tier: input.tier, durationDays: input.durationDays, branchLimit: input.branchLimit, cashierLimit: input.cashierLimit, regularPrice: input.regularPrice.toString(), salePrice: input.salePrice === null || input.salePrice === undefined ? null : input.salePrice.toString(), isActive: input.isActive, availability: input.availability, sortOrder: input.sortOrder };
  if (input.id) {
    await db.update(subscriptionPlans).set(values).where(eq(subscriptionPlans.id, input.id));
    return { id: input.id };
  }
  const result = await db.insert(subscriptionPlans).values(values);
  return { id: Number(result[0].insertId) };
}

export async function deleteSubscriptionPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const usage = await db.select({ id: tenantSubscriptions.id }).from(tenantSubscriptions).where(eq(tenantSubscriptions.planId, id)).limit(1);
  if (usage[0]) {
    await db.update(subscriptionPlans).set({ availability: "archived", isActive: "no" }).where(eq(subscriptionPlans.id, id));
    return { deleted: false, archived: true };
  }
  await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  return { deleted: true, archived: false };
}

export async function setTenantSubscription(tenantId: number, input: { planId: number; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, input.planId)).limit(1))[0];
  if (!plan || plan.isActive !== "yes" || plan.availability !== "available") throw new Error("Paket tidak tersedia untuk diaktifkan.");
  const now = new Date();
  const assignment = buildPackageAssignment(tenantId, plan, input.createdBy, now);
  await db.transaction(async tx => {
    await tx.update(tenants).set(assignment.tenantUpdate).where(eq(tenants.id, tenantId));
    await tx.insert(tenantSubscriptions).values(assignment.subscriptionInsert);
  });
  return { endsAt: assignment.endsAt, planId: plan.id, planName: plan.name, tier: plan.tier, branchLimit: plan.branchLimit, cashierLimit: plan.cashierLimit };
}

export async function setTenantStatus(tenantId: number, status: "active" | "suspended") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(tenants).set(status === "suspended" ? { status, subscriptionStatus: "suspended" } : { status }).where(eq(tenants.id, tenantId));
}

export async function setUserAccountStatus(userId: number, status: "active" | "inactive") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(users).set({ status }).where(eq(users.id, userId));
}

export async function resetUserPassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(users).set({ passwordHash: hashPassword(newPassword), passwordUpdatedAt: new Date(), passwordChangeRequired: "yes", status: "active" }).where(eq(users.id, userId));
}

export async function changeRequiredPassword(userId: number, currentPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user || user.status !== "active" || !verifyPassword(currentPassword, user.passwordHash)) throw new Error("Kata sandi saat ini tidak sesuai.");
  await db.update(users).set({ passwordHash: hashPassword(newPassword), passwordUpdatedAt: new Date(), passwordChangeRequired: "no" }).where(eq(users.id, userId));
  return { success: true } as const;
}

export const passwordAccountRepository = {
  async findByEmail(email: string) {
    const db = await getDb();
    if (!db) throw new Error("Database tidak tersedia.");
    return (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  },
  async recordSignIn(userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database tidak tersedia.");
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
  },
};

export async function authenticatePasswordLogin(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  if (!email) return undefined;
  const user = await passwordAccountRepository.findByEmail(email);
  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) return undefined;
  await passwordAccountRepository.recordSignIn(user.id);
  return user;
}

export async function listBranches(scope: TenantScope) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.tenantId, scope.tenantId)).orderBy(asc(branches.status), asc(branches.name));
}

export async function createBranch(scope: TenantScope, input: { name: string; code: string; address?: string | null }) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin tenant yang dapat membuat cabang.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const activeBranches = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.tenantId, scope.tenantId), eq(branches.status, "active")));
  if (!canCreateBranchForPackage(activeBranches.length, scope.subscription.branchLimit)) throw new Error(packageBranchLimitMessage(scope.subscription.branchLimit));
  const result = await db.insert(branches).values({ tenantId: scope.tenantId, name: input.name, code: input.code.toUpperCase(), address: input.address ?? null });
  return { id: Number(result[0].insertId) };
}

export async function archiveBranch(scope: TenantScope, id: number) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin tenant yang dapat mengarsipkan cabang.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (id === scope.branchId) throw new Error("Pilih cabang lain sebelum mengarsipkan cabang aktif.");
  await db.update(branches).set({ status: "archived" }).where(and(eq(branches.id, id), eq(branches.tenantId, scope.tenantId)));
}

export async function listTenantMembers(scope: TenantScope) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin tenant yang dapat melihat pengguna.");
  const db = await getDb();
  if (!db) return { members: [], invitations: [] };
  const members = await db
    .select({ id: tenantMembers.id, role: tenantMembers.role, status: tenantMembers.status, userId: users.id, name: users.name, email: users.email, branchId: tenantMembers.branchId, branchName: branches.name })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .leftJoin(branches, eq(tenantMembers.branchId, branches.id))
    .where(eq(tenantMembers.tenantId, scope.tenantId));
  const invitations = await db.select().from(tenantInvitations).where(eq(tenantInvitations.tenantId, scope.tenantId)).orderBy(desc(tenantInvitations.invitedAt));
  return { members, invitations };
}

export async function reassignCashierBranch(scope: TenantScope, memberId: number, branchId: number) {
  if (!scope.isTenantAdmin) throw new Error("Hanya Admin Utama yang dapat memindahkan penugasan kasir.");
  if (!scope.branches.some(branch => branch.id === branchId && branch.status === "active")) throw new Error("Cabang penugasan tidak valid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const member = (await db.select({ userId: tenantMembers.userId, role: tenantMembers.role }).from(tenantMembers).where(and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, scope.tenantId), eq(tenantMembers.status, "active"))).limit(1))[0];
  if (!member || member.role !== "cashier") throw new Error("Akun kasir tidak ditemukan.");
  await db.transaction(async tx => {
    await tx.update(tenantMembers).set({ branchId }).where(eq(tenantMembers.id, memberId));
    await tx.update(users).set({ activeBranchId: branchId }).where(eq(users.id, member.userId));
  });
  return { success: true } as const;
}

export async function inviteCashier(scope: TenantScope, invitedBy: number, input: { email: string; branchId: number }) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin tenant yang dapat mengundang kasir.");
  if (!scope.branches.some(branch => branch.id === input.branchId)) throw new Error("Cabang undangan tidak valid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email kasir wajib diisi.");
  await db.insert(tenantInvitations).values({ tenantId: scope.tenantId, email, branchId: input.branchId, invitedBy }).onDuplicateKeyUpdate({ set: { branchId: input.branchId, status: "pending", invitedBy, invitedAt: new Date(), claimedAt: null } });
}

export async function createCashierAccount(scope: TenantScope, input: { name: string; email: string; password: string; branchId: number }) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin tenant yang dapat membuat akun kasir.");
  if (!scope.branches.some(branch => branch.id === input.branchId)) throw new Error("Cabang kasir tidak valid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email kasir wajib diisi.");
  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) throw new Error("Email kasir sudah digunakan. Gunakan email lain.");
  const activeCashiers = await db.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.tenantId, scope.tenantId), eq(tenantMembers.role, "cashier"), eq(tenantMembers.status, "active")));
  assertCashierQuota(activeCashiers.length, scope.subscription.cashierLimit, scope.subscription.planName);
  const now = new Date();
  return db.transaction(async tx => {
    const result = await tx.insert(users).values({
      openId: `cashier_${nanoid(21)}`,
      name: input.name.trim(),
      email,
      loginMethod: "tenant_password",
      passwordHash: hashPassword(input.password),
      passwordUpdatedAt: now,
      role: "cashier",
      status: "active",
      activeBranchId: input.branchId,
      lastSignedIn: now,
    });
    const userId = Number(result[0].insertId);
    await tx.insert(tenantMembers).values({ tenantId: scope.tenantId, userId, branchId: input.branchId, role: "cashier", status: "active" });
    await tx.update(tenantInvitations).set({ status: "revoked" }).where(and(eq(tenantInvitations.tenantId, scope.tenantId), eq(tenantInvitations.email, email), eq(tenantInvitations.status, "pending")));
    return { id: userId, name: input.name.trim(), email, branchId: input.branchId, role: "cashier" as const };
  });
}

export async function createBranchAdminAccount(scope: TenantScope, input: { name: string; email: string; password: string; branchId: number }) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin utama yang dapat membuat admin cabang.");
  if (!scope.branches.some(branch => branch.id === input.branchId)) throw new Error("Cabang admin tidak valid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email admin cabang wajib diisi.");
  const existingUser = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (existingUser) throw new Error("Email sudah digunakan. Gunakan email lain.");
  const existingBranchAdmin = (await db.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.tenantId, scope.tenantId), eq(tenantMembers.branchId, input.branchId), eq(tenantMembers.role, "branch_admin"), eq(tenantMembers.status, "active"))).limit(1))[0];
  if (existingBranchAdmin) throw new Error("Cabang ini sudah memiliki admin cabang aktif.");
  const now = new Date();
  return db.transaction(async tx => {
    const result = await tx.insert(users).values({ openId: `branch_admin_${nanoid(18)}`, name: input.name.trim(), email, loginMethod: "tenant_password", passwordHash: hashPassword(input.password), passwordUpdatedAt: now, role: "admin", status: "active", activeBranchId: input.branchId, lastSignedIn: now });
    const userId = Number(result[0].insertId);
    await tx.insert(tenantMembers).values({ tenantId: scope.tenantId, userId, branchId: input.branchId, role: "branch_admin", status: "active" });
    return { id: userId, name: input.name.trim(), email, branchId: input.branchId, role: "branch_admin" as const };
  });
}

export async function createTenantAdminAccount(tenantId: number, input: { name: string; email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email admin utama wajib diisi.");
  const [tenant, existingUser, existingTenantAdmin] = await Promise.all([
    db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1).then(rows => rows[0]),
    db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1).then(rows => rows[0]),
    db.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "tenant_admin"), eq(tenantMembers.status, "active"))).limit(1).then(rows => rows[0]),
  ]);
  if (!tenant) throw new Error("Usaha tidak ditemukan.");
  if (existingUser) throw new Error("Email sudah digunakan. Gunakan email lain.");
  if (existingTenantAdmin) throw new Error("Usaha ini sudah memiliki Admin Utama aktif. Gunakan reset kata sandi untuk admin tersebut.");
  const branch = (await db.select().from(branches).where(and(eq(branches.tenantId, tenantId), eq(branches.status, "active"))).orderBy(asc(branches.id)).limit(1))[0];
  if (!branch) throw new Error("Usaha belum memiliki cabang aktif.");
  const now = new Date();
  return db.transaction(async tx => {
    const result = await tx.insert(users).values({ openId: `tenant_admin_${nanoid(18)}`, name: input.name.trim(), email, loginMethod: "tenant_password", passwordHash: hashPassword(input.password), passwordUpdatedAt: now, passwordChangeRequired: "yes", role: "admin", status: "active", activeBranchId: branch.id, lastSignedIn: now });
    const userId = Number(result[0].insertId);
    await tx.insert(tenantMembers).values({ tenantId, userId, branchId: branch.id, role: "tenant_admin", status: "active" });
    await tx.update(tenantInvitations).set({ status: "revoked" }).where(and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.email, email), eq(tenantInvitations.status, "pending")));
    return { id: userId, name: input.name.trim(), email, branchId: branch.id, role: "tenant_admin" as const, passwordChangeRequired: true };
  });
}

export async function deleteTenant(tenantId: number, confirmationName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.transaction(async tx => {
    const tenant = (await tx.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0];
    if (!tenant) throw new Error("Usaha tidak ditemukan atau sudah dihapus.");
    if (tenant.name.trim() !== confirmationName.trim()) throw new Error("Ketik nama usaha dengan tepat untuk mengonfirmasi penghapusan.");
    const memberRows = await tx.select({ userId: tenantMembers.userId }).from(tenantMembers).where(eq(tenantMembers.tenantId, tenantId));
    const branchRows = await tx.select({ id: branches.id }).from(branches).where(eq(branches.tenantId, tenantId));
    const transactionRows = await tx.select({ id: salesTransactions.id }).from(salesTransactions).where(eq(salesTransactions.tenantId, tenantId));
    const userIds = Array.from(new Set(memberRows.map(row => row.userId)));
    const branchIds = branchRows.map(row => row.id);
    const transactionIds = transactionRows.map(row => row.id);
    if (transactionIds.length) await tx.delete(salesTransactionItems).where(inArray(salesTransactionItems.transactionId, transactionIds));
    await tx.delete(stockMovements).where(eq(stockMovements.tenantId, tenantId));
    await tx.delete(salesTransactions).where(eq(salesTransactions.tenantId, tenantId));
    await tx.delete(products).where(eq(products.tenantId, tenantId));
    await tx.delete(tenantInvitations).where(eq(tenantInvitations.tenantId, tenantId));
    await tx.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId));
    await tx.delete(tenantMembers).where(eq(tenantMembers.tenantId, tenantId));
    if (branchIds.length) await tx.update(users).set({ activeBranchId: null }).where(inArray(users.activeBranchId, branchIds));
    await tx.delete(branches).where(eq(branches.tenantId, tenantId));
    await tx.delete(tenants).where(eq(tenants.id, tenantId));
    let removedUsers = 0;
    for (const userId of userIds) {
      const [remainingMembership, user] = await Promise.all([
        tx.select({ id: tenantMembers.id }).from(tenantMembers).where(eq(tenantMembers.userId, userId)).limit(1).then(rows => rows[0]),
        tx.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1).then(rows => rows[0]),
      ]);
      if (!remainingMembership && user && user.role !== "superadmin") {
        await tx.delete(users).where(eq(users.id, userId));
        removedUsers += 1;
      }
    }
    return { deletedTenantName: tenant.name, removedUsers };
  });
}

export async function updateTenantName(tenantId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new Error("Nama usaha minimal 2 karakter.");
  await db.update(tenants).set({ name: normalizedName }).where(eq(tenants.id, tenantId));
  return { success: true } as const;
}

export async function updateTenantAdminAccount(tenantId: number, userId: number, input: { name: string; email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email Admin Utama wajib diisi.");
  return db.transaction(async tx => {
    const membership = (await tx.select().from(tenantMembers).where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId), eq(tenantMembers.role, "tenant_admin"), eq(tenantMembers.status, "active"))).limit(1))[0];
    if (!membership) throw new Error("Admin Utama usaha tidak ditemukan.");
    const existing = (await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
    if (existing && existing.id !== userId) throw new Error("Email sudah digunakan oleh akun lain.");
    await tx.update(users).set({ name: input.name.trim(), email }).where(eq(users.id, userId));
    return { success: true } as const;
  });
}

export async function deleteTenantAdminAccount(tenantId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.transaction(async tx => {
    const membership = (await tx.select().from(tenantMembers).where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId), eq(tenantMembers.role, "tenant_admin"), eq(tenantMembers.status, "active"))).limit(1))[0];
    if (!membership) throw new Error("Admin Utama usaha tidak ditemukan.");
    await tx.delete(tenantMembers).where(eq(tenantMembers.id, membership.id));
    const remainingMembership = (await tx.select({ id: tenantMembers.id }).from(tenantMembers).where(eq(tenantMembers.userId, userId)).limit(1))[0];
    if (!remainingMembership) await tx.delete(users).where(and(eq(users.id, userId), eq(users.role, "admin")));
    return { success: true } as const;
  });
}

export async function listPlatformUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, loginMethod: users.loginMethod, lastSignedIn: users.lastSignedIn, membershipId: tenantMembers.id, membershipRole: tenantMembers.role, membershipStatus: tenantMembers.status, tenantId: tenants.id, tenantName: tenants.name, branchId: branches.id, branchName: branches.name })
    .from(users)
    .leftJoin(tenantMembers, eq(tenantMembers.userId, users.id))
    .leftJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .leftJoin(branches, eq(branches.id, tenantMembers.branchId))
    .orderBy(asc(users.role), asc(users.name));
}

export async function getPlatformStatistics() {
  const db = await getDb();
  if (!db) return summarizePlatformStats({ tenants: [], users: [], memberships: [] });
  const [tenantRows, userRows, membershipRows] = await Promise.all([
    db.select({ status: tenants.status, subscriptionStatus: tenants.subscriptionStatus }).from(tenants),
    db.select({ id: users.id, status: users.status, role: users.role }).from(users),
    db.select({ userId: tenantMembers.userId, status: tenantMembers.status, role: tenantMembers.role }).from(tenantMembers),
  ]);
  return summarizePlatformStats({ tenants: tenantRows, users: userRows, memberships: membershipRows });
}

export async function listPlatformUserOptions() {
  const db = await getDb();
  if (!db) return [];
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name, status: tenants.status }).from(tenants).orderBy(asc(tenants.name));
  const branchRows = await db.select({ id: branches.id, tenantId: branches.tenantId, name: branches.name, code: branches.code, status: branches.status }).from(branches).where(eq(branches.status, "active")).orderBy(asc(branches.name));
  return tenantRows.map(tenant => ({ ...tenant, branches: branchRows.filter(branch => branch.tenantId === tenant.id) }));
}

export async function createPlatformUser(input: { name: string; email: string; password: string; tenantId: number; branchId: number; membershipRole: "tenant_admin" | "branch_admin" | "cashier" }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.transaction(async tx => {
    const branch = (await tx.select().from(branches).where(and(eq(branches.id, input.branchId), eq(branches.tenantId, input.tenantId), eq(branches.status, "active"))).limit(1))[0];
    if (!branch) throw new Error("Cabang pengguna tidak valid.");
    if (input.membershipRole === "tenant_admin") {
      const existingAdmin = (await tx.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.tenantId, input.tenantId), eq(tenantMembers.role, "tenant_admin"), eq(tenantMembers.status, "active"))).limit(1))[0];
      if (existingAdmin) throw new Error("Usaha ini sudah memiliki Admin Utama aktif.");
    }
    if (input.membershipRole === "cashier") {
      const tenant = (await tx.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1))[0];
      const plan = tenant?.activePlanId ? (await tx.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, tenant.activePlanId)).limit(1))[0] : undefined;
      const activeCashiers = await tx.select({ id: tenantMembers.id }).from(tenantMembers).where(and(eq(tenantMembers.tenantId, input.tenantId), eq(tenantMembers.role, "cashier"), eq(tenantMembers.status, "active")));
      assertCashierQuota(activeCashiers.length, plan?.cashierLimit ?? 2, plan?.name ?? "Trial Bronze");
    }
    const email = normalizeEmail(input.email);
    const existing = email ? (await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0] : undefined;
    if (existing) throw new Error("Email pengguna sudah terdaftar.");
    const appRole = input.membershipRole === "cashier" ? "cashier" as const : "admin" as const;
    const userResult = await tx.insert(users).values({ openId: `manual_${nanoid(18)}`, name: input.name.trim(), email, loginMethod: "password", passwordHash: hashPassword(input.password), passwordUpdatedAt: new Date(), passwordChangeRequired: "yes", role: appRole, status: "active", activeBranchId: input.branchId });
    const userId = Number(userResult[0].insertId);
    await tx.insert(tenantMembers).values({ tenantId: input.tenantId, userId, branchId: input.branchId, role: input.membershipRole, status: "active" });
    return { id: userId, passwordChangeRequired: true };
  });
}

export async function updatePlatformUser(userId: number, input: { name: string; email: string; status: "active" | "inactive" }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const user = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user || user.role === "superadmin") throw new Error("Akun Superadmin tidak dapat diubah dari manajemen pengguna.");
  await db.update(users).set({ name: input.name.trim(), email: normalizeEmail(input.email), status: input.status }).where(eq(users.id, userId));
  return { success: true } as const;
}

export async function deletePlatformUserAccess(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  return db.transaction(async tx => {
    const user = (await tx.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user || user.role === "superadmin") throw new Error("Akun Superadmin tidak dapat dihapus.");
    await tx.update(tenantMembers).set({ status: "inactive" }).where(eq(tenantMembers.userId, userId));
    await tx.update(users).set({ status: "inactive" }).where(eq(users.id, userId));
    return { success: true } as const;
  });
}

export async function resetTenantMemberPassword(scope: TenantScope, memberId: number, newPassword: string) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin utama yang dapat mengubah kata sandi pengguna.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const member = (await db.select({ userId: tenantMembers.userId, role: tenantMembers.role }).from(tenantMembers).where(and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, scope.tenantId), eq(tenantMembers.status, "active"))).limit(1))[0];
  if (!member || member.role === "tenant_admin") throw new Error("Akun kasir atau admin cabang tidak ditemukan.");
  await db.update(users).set({ passwordHash: hashPassword(newPassword), passwordUpdatedAt: new Date(), status: "active" }).where(eq(users.id, member.userId));
  return { success: true };
}

export async function inviteTenantAdmin(tenantId: number, invitedBy: number, input: { email: string; branchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branch = (await db.select().from(branches).where(and(eq(branches.id, input.branchId), eq(branches.tenantId, tenantId), eq(branches.status, "active"))).limit(1))[0];
  if (!branch) throw new Error("Cabang tenant tidak valid.");
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email admin tenant wajib diisi.");
  await db.insert(tenantInvitations).values({ tenantId, email, branchId: input.branchId, role: "tenant_admin", invitedBy }).onDuplicateKeyUpdate({ set: { branchId: input.branchId, role: "tenant_admin", status: "pending", invitedBy, invitedAt: new Date(), claimedAt: null } });
}

export async function deactivateTenantMember(scope: TenantScope, memberId: number) {
  if (!scope.isTenantAdmin) throw new Error("Hanya admin tenant yang dapat mengatur pengguna.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const member = (await db.select({ role: tenantMembers.role, status: tenantMembers.status }).from(tenantMembers).where(and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, scope.tenantId))).limit(1))[0];
  if (!member || !canDeactivateMember(member)) throw new Error("Hanya kasir atau admin cabang aktif yang dapat dinonaktifkan.");
  await db.update(tenantMembers).set({ status: "inactive" }).where(eq(tenantMembers.id, memberId));
}

type ProductCreateInput = { name: string; category: string; imageKey?: string | null; imageUrl?: string | null; salePrice: number; costPrice: number; stock: number; lowStockThreshold: number; branchId?: number };
type ProductUpdateInput = Pick<ProductCreateInput, "name" | "category" | "imageKey" | "imageUrl" | "salePrice" | "costPrice" | "lowStockThreshold" | "branchId">;
const productScopeCondition = (scope: TenantScope, branchId = scope.branchId) => and(eq(products.tenantId, scope.tenantId), eq(products.branchId, branchId));
const transactionScopeCondition = (scope: TenantScope) => and(eq(salesTransactions.tenantId, scope.tenantId), eq(salesTransactions.branchId, scope.branchId));

export function resolveProductBranchId(scope: TenantScope, requestedBranchId?: number) {
  const branchId = scope.isTenantAdmin ? (requestedBranchId ?? scope.branchId) : scope.branchId;
  if (!scope.branches.some(branch => branch.id === branchId && branch.status === "active")) throw new Error("Cabang produk tidak valid atau tidak dapat diakses.");
  return branchId;
}

export async function listActiveProducts(scope: TenantScope) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(products).where(and(eq(products.status, "active"), productScopeCondition(scope))).orderBy(asc(products.name));
  return filterRecordsToScope(rows, scope);
}

export async function listAllProducts(scope: TenantScope, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  const scopedToBranch = { ...scope, branchId };
  const rows = await db.select().from(products).where(productScopeCondition(scope, branchId)).orderBy(asc(products.status), asc(products.name));
  return filterRecordsToScope(rows, scopedToBranch);
}

export async function listArchivedProducts(scope: TenantScope, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  const scopedToBranch = { ...scope, branchId };
  const rows = await db.select().from(products).where(and(eq(products.status, "archived"), productScopeCondition(scope, branchId))).orderBy(asc(products.name));
  return filterRecordsToScope(rows, scopedToBranch);
}

export async function getProductByQr(qrCode: string, scope: TenantScope) {
  const db = await getDb();
  if (!db) return undefined;
  return filterRecordsToScope(await db.select().from(products).where(and(eq(products.qrCode, qrCode.trim()), eq(products.status, "active"), productScopeCondition(scope))).limit(1), scope)[0];
}

export async function createProduct(input: ProductCreateInput, userId: number, scope: TenantScope) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const qrCode = `JJN-${nanoid(10).toUpperCase()}`;
  const branchId = resolveProductBranchId(scope, input.branchId);
  return db.transaction(async tx => {
    const { branchId: _requestedBranchId, ...productValues } = input;
    const result = await tx.insert(products).values({ ...productValues, salePrice: input.salePrice.toString(), costPrice: input.costPrice.toString(), qrCode, createdBy: userId, tenantId: scope.tenantId, branchId });
    const productId = Number(result[0].insertId);
    await tx.insert(stockMovements).values({ productId, type: "initial", quantity: input.stock, previousStock: 0, resultingStock: input.stock, note: "Stok awal produk", createdBy: userId, tenantId: scope.tenantId, branchId });
    return { id: productId, qrCode };
  });
}

export async function updateProduct(id: number, input: ProductUpdateInput, scope: TenantScope) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, input.branchId);
  const imageFields = input.imageKey === undefined && input.imageUrl === undefined ? {} : { imageKey: input.imageKey ?? null, imageUrl: input.imageUrl ?? null };
  await db.update(products).set({ name: input.name, category: input.category, ...imageFields, salePrice: input.salePrice.toString(), costPrice: input.costPrice.toString(), lowStockThreshold: input.lowStockThreshold }).where(and(eq(products.id, id), productScopeCondition(scope, branchId)));
}

export async function archiveProduct(id: number, userId: number, scope: TenantScope, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db.transaction(async tx => {
    const product = (await tx.select().from(products).where(and(eq(products.id, id), eq(products.status, "active"), productScopeCondition(scope, branchId))).limit(1))[0];
    if (!product) throw new Error("Produk aktif tidak ditemukan pada cabang ini.");
    await tx.update(products).set({ status: "archived" }).where(eq(products.id, id));
    await tx.insert(productLifecycleEvents).values({ productId: product.id, productName: product.name, productQrCode: product.qrCode, action: "archived", stockAtAction: product.stock, tenantId: scope.tenantId, branchId, createdBy: userId });
  });
}

export async function restoreProduct(id: number, userId: number, scope: TenantScope, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db.transaction(async tx => {
    const product = (await tx.select().from(products).where(and(eq(products.id, id), eq(products.status, "archived"), productScopeCondition(scope, branchId))).limit(1))[0];
    if (!product) throw new Error("Produk arsip tidak ditemukan pada cabang ini.");
    await tx.update(products).set({ status: "active" }).where(eq(products.id, id));
    await tx.insert(productLifecycleEvents).values({ productId: product.id, productName: product.name, productQrCode: product.qrCode, action: "restored", stockAtAction: product.stock, tenantId: scope.tenantId, branchId, createdBy: userId });
  });
}

export function getProductDeletionBlockReason(product: { status: "active" | "archived"; stock: number }) {
  if (product.status !== "archived") return "Arsipkan produk terlebih dahulu sebelum menghapus permanen.";
  if (product.stock !== 0) return "Produk hanya dapat dihapus jika stok sudah 0 unit.";
  return null;
}

export async function deleteProductPermanently(id: number, userId: number, scope: TenantScope, requestedBranchId?: number) {
  if (!scope.isTenantAdmin) throw new Error("Hanya Admin Utama yang dapat menghapus produk permanen.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db.transaction(async tx => {
    const product = (await tx.select().from(products).where(and(eq(products.id, id), eq(products.status, "archived"), productScopeCondition(scope, branchId))).limit(1))[0];
    if (!product) throw new Error("Produk arsip tidak ditemukan pada cabang ini.");
    const deletionBlockReason = getProductDeletionBlockReason(product);
    if (deletionBlockReason) throw new Error(deletionBlockReason);
    const usedByPromotion = (await tx.select({ id: promotionItems.id }).from(promotionItems).where(eq(promotionItems.productId, id)).limit(1))[0];
    if (usedByPromotion) throw new Error("Produk masih digunakan dalam promo. Hapus produk dari promo terlebih dahulu.");
    await tx.insert(productLifecycleEvents).values({ productId: product.id, productName: product.name, productQrCode: product.qrCode, action: "deleted", stockAtAction: product.stock, tenantId: scope.tenantId, branchId, createdBy: userId });
    await tx.delete(products).where(eq(products.id, id));
  });
}

export async function listProductLifecycleEvents(scope: TenantScope, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db.select({ id: productLifecycleEvents.id, productId: productLifecycleEvents.productId, productName: productLifecycleEvents.productName, productQrCode: productLifecycleEvents.productQrCode, action: productLifecycleEvents.action, stockAtAction: productLifecycleEvents.stockAtAction, createdAt: productLifecycleEvents.createdAt, createdByName: users.name }).from(productLifecycleEvents).leftJoin(users, eq(productLifecycleEvents.createdBy, users.id)).where(and(eq(productLifecycleEvents.tenantId, scope.tenantId), eq(productLifecycleEvents.branchId, branchId))).orderBy(desc(productLifecycleEvents.createdAt), desc(productLifecycleEvents.id)).limit(200);
}

export async function adjustProductStock(id: number, delta: number, userId: number, scope: TenantScope, note?: string, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db.transaction(async tx => {
    const product = (await tx.select().from(products).where(and(eq(products.id, id), eq(products.status, "active"), productScopeCondition(scope, branchId))).limit(1))[0];
    if (!product) throw new Error("Produk aktif tidak ditemukan.");
    const nextStock = calculateNextStock(product.stock, delta);
    await tx.update(products).set({ stock: nextStock }).where(eq(products.id, id));
    await tx.insert(stockMovements).values({ productId: id, type: delta >= 0 ? "restock" : "adjustment", quantity: delta, previousStock: product.stock, resultingStock: nextStock, note: note || (delta >= 0 ? "Tambah stok" : "Penyesuaian stok"), createdBy: userId, tenantId: scope.tenantId, branchId });
    return nextStock;
  });
}

export async function listStockMovements(scope: TenantScope, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productCategory: products.category,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      previousStock: stockMovements.previousStock,
      resultingStock: stockMovements.resultingStock,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      createdByName: users.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(users, eq(stockMovements.createdBy, users.id))
    .where(and(eq(stockMovements.tenantId, scope.tenantId), eq(stockMovements.branchId, branchId)))
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .limit(200);
}

export type PromotionDraft = {
  id?: number;
  name: string;
  type: "discount" | "bundle";
  status: "active" | "inactive";
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number | null;
  bundlePrice?: number | null;
  startsAt: Date;
  endsAt: Date;
  branchId?: number;
  items: Array<{ productId: number; quantity: number }>;
};

async function promotionRulesForBranch(scope: TenantScope, branchId: number, activeOnly = false) {
  const db = await getDb();
  if (!db) return [] as PromotionRule[];
  const now = new Date();
  const conditions = [eq(promotions.tenantId, scope.tenantId), eq(promotions.branchId, branchId)];
  if (activeOnly) conditions.push(eq(promotions.status, "active"), lte(promotions.startsAt, now), gte(promotions.endsAt, now));
  const rows = await db.select().from(promotions).where(and(...conditions)).orderBy(desc(promotions.createdAt));
  if (!rows.length) return [];
  const itemRows = await db.select().from(promotionItems).where(inArray(promotionItems.promotionId, rows.map(row => row.id)));
  return rows.map(row => ({ id: row.id, name: row.name, type: row.type, discountType: row.discountType, discountValue: row.discountValue === null ? null : Number(row.discountValue), bundlePrice: row.bundlePrice === null ? null : Number(row.bundlePrice), items: itemRows.filter(item => item.promotionId === row.id).map(item => ({ productId: item.productId, quantity: item.quantity })) }));
}

async function assertPromotionProducts(scope: TenantScope, branchId: number, items: PromotionDraft["items"]) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const productIds = Array.from(new Set(items.map(item => item.productId)));
  const scopedProducts = filterRecordsToScope(await db.select().from(products).where(and(inArray(products.id, productIds), eq(products.status, "active"), productScopeCondition(scope, branchId))), scope);
  if (scopedProducts.length !== productIds.length) throw new Error("Produk promo harus berasal dari cabang yang dipilih dan masih aktif.");
}

export async function listPromotions(scope: TenantScope, requestedBranchId?: number) {
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  const rules = await promotionRulesForBranch(scope, branchId);
  const db = await getDb();
  if (!db || !rules.length) return [];
  const ids = rules.flatMap(rule => rule.items.map(item => item.productId));
  const rows = ids.length ? await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, Array.from(new Set(ids)))) : [];
  const productNames = new Map(rows.map(row => [row.id, row.name]));
  const all = await db.select().from(promotions).where(and(eq(promotions.tenantId, scope.tenantId), eq(promotions.branchId, branchId))).orderBy(desc(promotions.createdAt));
  const ruleById = new Map(rules.map(rule => [rule.id, rule]));
  return all.map(row => ({ ...row, discountValue: row.discountValue === null ? null : Number(row.discountValue), bundlePrice: row.bundlePrice === null ? null : Number(row.bundlePrice), items: (ruleById.get(row.id)?.items || []).map(item => ({ ...item, productName: productNames.get(item.productId) || "Produk" })) }));
}

export async function savePromotion(scope: TenantScope, userId: number, input: PromotionDraft) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, input.branchId);
  if (input.endsAt <= input.startsAt) throw new Error("Waktu berakhir promo harus setelah waktu mulai.");
  if (input.type === "bundle" && input.items.length < 2) throw new Error("Bundling minimal berisi dua produk.");
  if (input.type === "discount" && input.items.length < 1) throw new Error("Pilih minimal satu produk untuk diskon.");
  await assertPromotionProducts(scope, branchId, input.items);
  return db.transaction(async tx => {
    const data = { tenantId: scope.tenantId, branchId, name: input.name, type: input.type, status: input.status, discountType: input.type === "discount" ? input.discountType || null : null, discountValue: input.type === "discount" && input.discountValue !== null && input.discountValue !== undefined ? input.discountValue.toString() : null, bundlePrice: input.type === "bundle" && input.bundlePrice !== null && input.bundlePrice !== undefined ? input.bundlePrice.toString() : null, startsAt: input.startsAt, endsAt: input.endsAt, createdBy: userId };
    let promotionId = input.id;
    if (promotionId) {
      const existing = (await tx.select({ id: promotions.id }).from(promotions).where(and(eq(promotions.id, promotionId), eq(promotions.tenantId, scope.tenantId), eq(promotions.branchId, branchId))).limit(1))[0];
      if (!existing) throw new Error("Promo tidak ditemukan pada cabang yang dipilih.");
      await tx.update(promotions).set(data).where(eq(promotions.id, promotionId));
      await tx.delete(promotionItems).where(eq(promotionItems.promotionId, promotionId));
    } else {
      const result = await tx.insert(promotions).values(data);
      promotionId = Number(result[0].insertId);
    }
    await tx.insert(promotionItems).values(input.items.map(item => ({ promotionId: promotionId!, productId: item.productId, quantity: item.quantity })));
    return { id: promotionId };
  });
}

export async function deletePromotion(scope: TenantScope, id: number, requestedBranchId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const branchId = resolveProductBranchId(scope, requestedBranchId);
  return db.transaction(async tx => {
    const existing = (await tx.select({ id: promotions.id }).from(promotions).where(and(eq(promotions.id, id), eq(promotions.tenantId, scope.tenantId), eq(promotions.branchId, branchId))).limit(1))[0];
    if (!existing) throw new Error("Promo tidak ditemukan.");
    await tx.delete(promotionItems).where(eq(promotionItems.promotionId, id));
    await tx.delete(promotions).where(eq(promotions.id, id));
    return { success: true } as const;
  });
}

export async function quotePromotions(scope: TenantScope, items: PromotionCartLine[]) {
  const rules = await promotionRulesForBranch(scope, scope.branchId, true);
  return calculatePromotionPricing(items, rules);
}

type CheckoutInput = { cashierId: number; paymentMethod: "cash" | "qris"; amountReceived?: number; paymentProofKey?: string; paymentProofUrl?: string; paymentProofMimeType?: string; items: Array<{ productId: number; quantity: number }> };

export async function checkoutSale(input: CheckoutInput, scope: TenantScope) {
  requireQrisProof(input.paymentMethod, input.paymentProofUrl);
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (input.items.length === 0) throw new Error("Keranjang masih kosong.");
  if (input.paymentMethod === "cash" && input.amountReceived === undefined) throw new Error("Masukkan nominal tunai yang diterima.");
  const mergedItems = new Map<number, number>();
  input.items.forEach(item => mergedItems.set(item.productId, (mergedItems.get(item.productId) || 0) + item.quantity));
  const requested = Array.from(mergedItems.entries()).map(([productId, quantity]) => ({ productId, quantity }));

  return db.transaction(async tx => {
    const available = filterRecordsToScope(await tx.select().from(products).where(and(inArray(products.id, requested.map(item => item.productId)), eq(products.status, "active"), productScopeCondition(scope))), scope);
    if (available.length !== requested.length) throw new Error("Satu atau lebih produk tidak tersedia di cabang aktif.");
    const productById = new Map(available.map(product => [product.id, product]));
    const lines = requested.map(request => {
      const product = productById.get(request.productId)!;
      if (request.quantity > product.stock) throw new Error(`Stok ${product.name} tidak mencukupi.`);
      return { ...request, product, unitPrice: Number(product.salePrice), unitCost: Number(product.costPrice) };
    });
    const totals = calculateCheckout(lines);
    const promotionPricing = calculatePromotionPricing(lines.map(line => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })), await promotionRulesForBranch(scope, scope.branchId, true));
    const changeAmount = input.paymentMethod === "cash" ? calculateChange(promotionPricing.total, input.amountReceived) : 0;
    const receiptNo = `JJN-${Date.now().toString().slice(-8)}-${nanoid(4).toUpperCase()}`;
    const result = await tx.insert(salesTransactions).values({ receiptNo, cashierId: input.cashierId, tenantId: scope.tenantId, branchId: scope.branchId, paymentMethod: input.paymentMethod, subtotal: totals.subtotal.toString(), discountTotal: promotionPricing.discountTotal.toString(), promotionSummary: promotionPricing.promotionSummary, total: promotionPricing.total.toString(), amountReceived: input.paymentMethod === "cash" ? input.amountReceived?.toString() : null, changeAmount: changeAmount.toString(), paymentProofKey: input.paymentMethod === "qris" ? input.paymentProofKey : null, paymentProofUrl: input.paymentMethod === "qris" ? input.paymentProofUrl : null, paymentProofMimeType: input.paymentMethod === "qris" ? input.paymentProofMimeType : null });
    const transactionId = Number(result[0].insertId);
    for (const line of lines) {
      const nextStock = calculateNextStock(line.product.stock, -line.quantity);
      const update = await tx.update(products).set({ stock: nextStock }).where(and(eq(products.id, line.productId), eq(products.stock, line.product.stock), productScopeCondition(scope)));
      if (Number(update[0].affectedRows) !== 1) throw new Error("Stok berubah. Silakan ulangi transaksi.");
      const discountAmount = promotionPricing.lineDiscounts[line.productId] || 0;
      const lineTotal = line.quantity * line.unitPrice - discountAmount;
      await tx.insert(salesTransactionItems).values({ transactionId, productId: line.productId, productName: line.product.name, quantity: line.quantity, unitPrice: line.unitPrice.toString(), unitCost: line.unitCost.toString(), lineTotal: lineTotal.toString(), discountAmount: discountAmount.toString(), lineProfit: (lineTotal - line.quantity * line.unitCost).toString() });
      await tx.insert(stockMovements).values({ productId: line.productId, transactionId, type: "sale", quantity: -line.quantity, previousStock: line.product.stock, resultingStock: nextStock, note: `Penjualan ${receiptNo}`, createdBy: input.cashierId, tenantId: scope.tenantId, branchId: scope.branchId });
    }
    return {
      transactionId,
      receiptNo,
      subtotal: promotionPricing.subtotal,
      discountTotal: promotionPricing.discountTotal,
      promotionSummary: promotionPricing.promotionSummary,
      total: promotionPricing.total,
      paymentMethod: input.paymentMethod,
      amountReceived: input.paymentMethod === "cash" ? input.amountReceived ?? 0 : null,
      changeAmount,
      paidAt: new Date(),
      items: lines.map(line => ({ productName: line.product.name, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.quantity * line.unitPrice - (promotionPricing.lineDiscounts[line.productId] || 0) })),
    };
  });
}

export async function getDashboardData(period: DashboardPeriod, scope: TenantScope, requestedBranchId?: number | null) {
  const db = await getDb();
  const range = getDashboardPeriodRange(period);
  if (!db) return { periodSales: 0, periodTransactions: 0, periodLabel: range.label, topItems: [], lowStock: [], recentTransactions: [] };
  const branchId = resolveReportingBranchId({ isTenantAdmin: scope.isTenantAdmin, assignedBranchId: scope.branchId, availableBranchIds: scope.branches.map(branch => branch.id), requestedBranchId });
  const transactionTenantCondition = branchId === null ? eq(salesTransactions.tenantId, scope.tenantId) : and(eq(salesTransactions.tenantId, scope.tenantId), eq(salesTransactions.branchId, branchId));
  const productTenantCondition = branchId === null ? eq(products.tenantId, scope.tenantId) : and(eq(products.tenantId, scope.tenantId), eq(products.branchId, branchId));
  const periodCondition = and(transactionTenantCondition, gte(salesTransactions.paidAt, range.start), lt(salesTransactions.paidAt, range.end));
  const periodTransactions = await db.select().from(salesTransactions).where(periodCondition);
  const allItems = await db.select({ productName: salesTransactionItems.productName, quantity: salesTransactionItems.quantity, paidAt: salesTransactions.paidAt, tenantId: salesTransactions.tenantId, branchId: salesTransactions.branchId }).from(salesTransactionItems).innerJoin(salesTransactions, eq(salesTransactionItems.transactionId, salesTransactions.id)).where(periodCondition);
  const lowStock = await db.select().from(products).where(and(eq(products.status, "active"), productTenantCondition, lte(products.stock, products.lowStockThreshold))).orderBy(asc(products.stock)).limit(8);
  const recentTransactions = await db.select({ id: salesTransactions.id, receiptNo: salesTransactions.receiptNo, total: salesTransactions.total, paymentMethod: salesTransactions.paymentMethod, paymentProofUrl: salesTransactions.paymentProofUrl, paidAt: salesTransactions.paidAt, cashierName: users.name, tenantId: salesTransactions.tenantId, branchId: salesTransactions.branchId }).from(salesTransactions).leftJoin(users, eq(salesTransactions.cashierId, users.id)).where(periodCondition).orderBy(desc(salesTransactions.paidAt)).limit(8);
  return { ...summarizeDashboardSales(range, periodTransactions, allItems, recentTransactions), lowStock };
}

export async function getFinanceReport(from: Date, to: Date, scope: TenantScope, requestedBranchId?: number | null) {
  const db = await getDb();
  if (!db) return { revenue: 0, cost: 0, profit: 0, transactions: 0, paymentBreakdown: { cash: 0, qris: 0 } };
  const branchId = resolveReportingBranchId({ isTenantAdmin: scope.isTenantAdmin, assignedBranchId: scope.branchId, availableBranchIds: scope.branches.map(branch => branch.id), requestedBranchId });
  const tenantCondition = branchId === null ? eq(salesTransactions.tenantId, scope.tenantId) : and(eq(salesTransactions.tenantId, scope.tenantId), eq(salesTransactions.branchId, branchId));
  const condition = and(tenantCondition, gte(salesTransactions.paidAt, from), lte(salesTransactions.paidAt, to));
  const transactions = await db.select().from(salesTransactions).where(condition);
  const items = await db.select({ quantity: salesTransactionItems.quantity, unitCost: salesTransactionItems.unitCost, tenantId: salesTransactions.tenantId, branchId: salesTransactions.branchId }).from(salesTransactionItems).innerJoin(salesTransactions, eq(salesTransactionItems.transactionId, salesTransactions.id)).where(condition);
  return calculateFinanceSummary(transactions.map(transaction => ({ total: Number(transaction.total), paymentMethod: transaction.paymentMethod })), items.map(item => ({ quantity: item.quantity, unitCost: Number(item.unitCost) })));
}

export async function listTransactions(scope: TenantScope, requestedBranchId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const branchId = resolveReportingBranchId({ isTenantAdmin: scope.isTenantAdmin, assignedBranchId: scope.branchId, availableBranchIds: scope.branches.map(branch => branch.id), requestedBranchId });
  const condition = branchId === null ? eq(salesTransactions.tenantId, scope.tenantId) : and(eq(salesTransactions.tenantId, scope.tenantId), eq(salesTransactions.branchId, branchId));
  return db.select({ id: salesTransactions.id, receiptNo: salesTransactions.receiptNo, total: salesTransactions.total, paymentMethod: salesTransactions.paymentMethod, paymentProofUrl: salesTransactions.paymentProofUrl, paidAt: salesTransactions.paidAt, cashierName: users.name, tenantId: salesTransactions.tenantId, branchId: salesTransactions.branchId }).from(salesTransactions).leftJoin(users, eq(salesTransactions.cashierId, users.id)).where(condition).orderBy(desc(salesTransactions.paidAt)).limit(100);
}

export async function getTransactionReceipt(scope: TenantScope, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const scopeCondition = scope.isTenantAdmin
    ? eq(salesTransactions.tenantId, scope.tenantId)
    : and(eq(salesTransactions.tenantId, scope.tenantId), eq(salesTransactions.branchId, scope.branchId));
  const transaction = (await db.select({
    id: salesTransactions.id,
    receiptNo: salesTransactions.receiptNo,
    total: salesTransactions.total,
    subtotal: salesTransactions.subtotal,
    discountTotal: salesTransactions.discountTotal,
    promotionSummary: salesTransactions.promotionSummary,
    paymentMethod: salesTransactions.paymentMethod,
    amountReceived: salesTransactions.amountReceived,
    changeAmount: salesTransactions.changeAmount,
    paidAt: salesTransactions.paidAt,
    cashierName: users.name,
    branchName: branches.name,
  }).from(salesTransactions)
    .leftJoin(users, eq(salesTransactions.cashierId, users.id))
    .leftJoin(branches, eq(salesTransactions.branchId, branches.id))
    .where(and(eq(salesTransactions.id, transactionId), scopeCondition)).limit(1))[0];
  if (!transaction) throw new Error("Struk transaksi tidak ditemukan pada cabang Anda.");
  const items = await db.select({ productName: salesTransactionItems.productName, quantity: salesTransactionItems.quantity, unitPrice: salesTransactionItems.unitPrice, lineTotal: salesTransactionItems.lineTotal }).from(salesTransactionItems).where(eq(salesTransactionItems.transactionId, transactionId));
  return {
    ...transaction,
    total: Number(transaction.total),
    subtotal: Number(transaction.subtotal),
    discountTotal: Number(transaction.discountTotal),
    promotionSummary: transaction.promotionSummary,
    amountReceived: transaction.amountReceived === null ? null : Number(transaction.amountReceived),
    changeAmount: Number(transaction.changeAmount),
    items: items.map(item => ({ ...item, unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) })),
  };
}

export async function getStoreSettings() {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1))[0];
}

export async function updateStoreSettings(input: { storeName: string; qrisReference?: string | null; receiptFooter?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(storeSettings).values({ id: 1, ...input }).onDuplicateKeyUpdate({ set: input });
}

export type ReceiptTemplate = "simple" | "standard" | "complete";
export type TenantReceiptSettings = {
  template: ReceiptTemplate;
  paperWidth: "58" | "70";
  autoPrint: "yes" | "no";
  receiptFooter: string;
  businessName: string;
  businessAddress: string | null;
  businessLogoUrl: string | null;
  branchName: string;
};

const defaultReceiptSettings = { template: "standard" as const, paperWidth: "58" as const, autoPrint: "no" as const, receiptFooter: "Terima kasih sudah berbelanja." };

export async function getTenantReceiptSettings(scope: TenantScope): Promise<TenantReceiptSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [tenant, setting] = await Promise.all([
    db.select({ name: tenants.name, address: tenants.businessAddress, logoUrl: tenants.logoUrl }).from(tenants).where(eq(tenants.id, scope.tenantId)).limit(1),
    db.select().from(tenantReceiptSettings).where(eq(tenantReceiptSettings.tenantId, scope.tenantId)).limit(1),
  ]);
  const current = setting[0];
  return {
    template: current?.template ?? defaultReceiptSettings.template,
    paperWidth: current?.paperWidth ?? defaultReceiptSettings.paperWidth,
    autoPrint: current?.autoPrint ?? defaultReceiptSettings.autoPrint,
    receiptFooter: current?.receiptFooter ?? defaultReceiptSettings.receiptFooter,
    businessName: tenant[0]?.name ?? scope.tenantName,
    businessAddress: tenant[0]?.address ?? null,
    businessLogoUrl: tenant[0]?.logoUrl ?? null,
    branchName: scope.branchName,
  };
}

export async function updateTenantReceiptSettings(scope: TenantScope, input: Pick<TenantReceiptSettings, "template" | "paperWidth" | "autoPrint" | "receiptFooter">) {
  if (!scope.isTenantAdmin) throw new Error("Hanya Admin Utama yang dapat mengubah pengaturan struk.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(tenantReceiptSettings).values({ tenantId: scope.tenantId, ...input }).onDuplicateKeyUpdate({ set: input });
  return getTenantReceiptSettings(scope);
}
