type TenantSnapshot = { status: string; subscriptionStatus: string };
type UserSnapshot = { id: number; status: string; role: string };
type MembershipSnapshot = { userId: number; status: string; role: string };

const countUniqueActiveMembers = (memberships: MembershipSnapshot[], role: string) => new Set(memberships.filter(member => member.status === "active" && member.role === role).map(member => member.userId)).size;

export function summarizePlatformStats(input: { tenants: TenantSnapshot[]; users: UserSnapshot[]; memberships: MembershipSnapshot[] }) {
  const activeUsers = input.users.filter(user => user.status === "active");
  return {
    tenants: {
      total: input.tenants.length,
      active: input.tenants.filter(tenant => tenant.status === "active" && tenant.subscriptionStatus !== "suspended").length,
      trial: input.tenants.filter(tenant => tenant.subscriptionStatus === "trial").length,
      suspended: input.tenants.filter(tenant => tenant.status === "suspended" || tenant.subscriptionStatus === "suspended").length,
    },
    users: {
      total: input.users.length,
      active: activeUsers.length,
      superadmin: activeUsers.filter(user => user.role === "superadmin").length,
      adminUtama: countUniqueActiveMembers(input.memberships, "tenant_admin"),
      adminCabang: countUniqueActiveMembers(input.memberships, "branch_admin"),
      kasir: countUniqueActiveMembers(input.memberships, "cashier"),
    },
  };
}
