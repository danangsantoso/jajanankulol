export type OnboardingProfileInput = {
  businessName: string;
  ownerName: string;
  whatsappNumber: string;
  address: string;
  description?: string | null;
};

export function buildOnboardingTenantUpdate(input: OnboardingProfileInput, completedAt = new Date()) {
  return {
    name: input.businessName.trim(),
    ownerName: input.ownerName.trim(),
    whatsappNumber: input.whatsappNumber.trim(),
    businessAddress: input.address.trim(),
    businessDescription: input.description?.trim() || null,
    onboardingStatus: "complete" as const,
    onboardingCompletedAt: completedAt,
  };
}

export function getPostOnboardingPath(completed: boolean) {
  return completed ? "/dashboard" : "/onboarding";
}
