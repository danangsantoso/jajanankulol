export type PromotionPeriod = { status: "active" | "inactive"; startsAt: Date | string; endsAt: Date | string };
export type PromotionTimeline = "active" | "scheduled" | "ended" | "inactive";

export function getPromotionTimeline(promotion: PromotionPeriod, now = new Date()): PromotionTimeline {
  if (promotion.status !== "active") return "inactive";
  if (new Date(promotion.endsAt).getTime() <= now.getTime()) return "ended";
  if (new Date(promotion.startsAt).getTime() > now.getTime()) return "scheduled";
  return "active";
}

export function groupPromotionsByTimeline<T extends PromotionPeriod>(promotions: T[], now = new Date()) {
  return promotions.reduce<Record<PromotionTimeline, T[]>>((groups, promotion) => {
    groups[getPromotionTimeline(promotion, now)].push(promotion);
    return groups;
  }, { active: [], scheduled: [], ended: [], inactive: [] });
}
