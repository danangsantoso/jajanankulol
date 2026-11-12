export type TenantMembershipRole = "tenant_admin" | "branch_admin" | "cashier";

export function resolvePermittedBranchIds(role: TenantMembershipRole, assignedBranchId: number | null | undefined, availableBranchIds: number[]) {
  return role === "tenant_admin" ? availableBranchIds : assignedBranchId && availableBranchIds.includes(assignedBranchId) ? [assignedBranchId] : [];
}

export function canAccessBranch(role: TenantMembershipRole, assignedBranchId: number | null | undefined, availableBranchIds: number[], targetBranchId: number) {
  return resolvePermittedBranchIds(role, assignedBranchId, availableBranchIds).includes(targetBranchId);
}
