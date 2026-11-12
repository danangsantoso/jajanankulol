export const TRIAL_DAYS = 3;
const DAY_MS = 86_400_000;

export type SubscriptionSnapshot = {
  status: "trial" | "active" | "expired" | "suspended";
  trialEndsAt?: Date | null;
  subscriptionEndsAt?: Date | null;
};

export function trialEndsFrom(startedAt = new Date()) {
  return new Date(startedAt.getTime() + TRIAL_DAYS * DAY_MS);
}

export function getSubscriptionAccess(snapshot: SubscriptionSnapshot, now = new Date()) {
  if (snapshot.status === "suspended") return { allowed: false, state: "suspended" as const, message: "Akun usaha dinonaktifkan. Hubungi admin Jajananku untuk mengaktifkannya kembali." };
  if (snapshot.status === "trial") {
    if (!snapshot.trialEndsAt || snapshot.trialEndsAt > now) return { allowed: true, state: "trial" as const, daysRemaining: snapshot.trialEndsAt ? Math.max(0, Math.ceil((snapshot.trialEndsAt.getTime() - now.getTime()) / DAY_MS)) : null };
    return { allowed: false, state: "expired" as const, message: "Masa coba 3 hari telah berakhir. Hubungi admin atau pilih paket untuk melanjutkan." };
  }
  if (snapshot.status === "active" && (!snapshot.subscriptionEndsAt || snapshot.subscriptionEndsAt > now)) return { allowed: true, state: "active" as const, daysRemaining: snapshot.subscriptionEndsAt ? Math.max(0, Math.ceil((snapshot.subscriptionEndsAt.getTime() - now.getTime()) / DAY_MS)) : null };
  return { allowed: false, state: "expired" as const, message: "Masa aktif paket telah berakhir. Hubungi admin atau pilih paket untuk melanjutkan." };
}

export function addSubscriptionDays(startedAt: Date, durationDays: number) {
  return new Date(startedAt.getTime() + durationDays * DAY_MS);
}
