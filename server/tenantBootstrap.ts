export function shouldCreateInitialTenant(isPlatformOwner: boolean, hasActiveMembership: boolean) {
  return !isPlatformOwner && !hasActiveMembership;
}

export function initialTenantMembershipRole() {
  return "tenant_admin" as const;
}
