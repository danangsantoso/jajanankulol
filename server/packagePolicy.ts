import { addSubscriptionDays } from "./subscriptionAccess";

export type AssignablePlan = {
  id: number;
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  durationDays: number;
  branchLimit: number;
  cashierLimit: number;
};

export function buildPackageAssignment(tenantId: number, plan: AssignablePlan, createdBy: number, startsAt: Date) {
  const endsAt = addSubscriptionDays(startsAt, plan.durationDays);
  return {
    tenantId,
    endsAt,
    tenantUpdate: { status: "active" as const, subscriptionStatus: "active" as const, activePlanId: plan.id, trialEndsAt: null, subscriptionStartsAt: startsAt, subscriptionEndsAt: endsAt },
    subscriptionInsert: { tenantId, planId: plan.id, status: "active" as const, startsAt, endsAt, branchLimit: plan.branchLimit, cashierLimit: plan.cashierLimit, createdBy },
  };
}

export function assertCashierQuota(activeCashiers: number, cashierLimit: number, planName: string) {
  if (activeCashiers >= cashierLimit) throw new Error(`Kuota ${cashierLimit} kasir aktif pada paket ${planName} sudah tercapai.`);
}

export function resolveReportingBranchId(input: { isTenantAdmin: boolean; assignedBranchId: number; availableBranchIds: number[]; requestedBranchId?: number | null }) {
  if (!input.isTenantAdmin) return input.assignedBranchId;
  if (input.requestedBranchId === null || input.requestedBranchId === undefined) return null;
  if (!input.availableBranchIds.includes(input.requestedBranchId)) throw new Error("Cabang filter tidak valid untuk usaha ini.");
  return input.requestedBranchId;
}
