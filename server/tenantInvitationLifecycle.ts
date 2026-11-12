export type InvitationForClaim = { email: string; status: "pending" | "claimed" | "revoked"; role: "tenant_admin" | "branch_admin" | "cashier"; branchId: number };

export function resolveInvitationClaim(invitation: InvitationForClaim, userEmail: string) {
  const shouldClaim = invitation.status === "pending" && invitation.email.trim().toLowerCase() === userEmail.trim().toLowerCase();
  return { shouldClaim, membershipRole: invitation.role, membershipBranchId: invitation.role === "tenant_admin" ? null : invitation.branchId };
}

export function canDeactivateMember(member: { role: "tenant_admin" | "branch_admin" | "cashier"; status: "active" | "inactive" }) {
  return member.role !== "tenant_admin" && member.status === "active";
}
