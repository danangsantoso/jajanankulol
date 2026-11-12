import { describe, expect, it } from "vitest";
import { getPromotionTimeline, groupPromotionsByTimeline } from "./promotionStatus";

describe("status periode promo", () => {
  const now = new Date("2026-08-28T10:00:00.000Z");
  it("membedakan promo aktif, terjadwal, berakhir, dan dinonaktifkan", () => {
    expect(getPromotionTimeline({ status: "active", startsAt: "2026-08-28T09:00:00.000Z", endsAt: "2026-08-28T11:00:00.000Z" }, now)).toBe("active");
    expect(getPromotionTimeline({ status: "active", startsAt: "2026-08-28T11:00:00.000Z", endsAt: "2026-08-28T12:00:00.000Z" }, now)).toBe("scheduled");
    expect(getPromotionTimeline({ status: "active", startsAt: "2026-08-28T08:00:00.000Z", endsAt: "2026-08-28T09:00:00.000Z" }, now)).toBe("ended");
    expect(getPromotionTimeline({ status: "inactive", startsAt: "2026-08-28T08:00:00.000Z", endsAt: "2026-08-28T11:00:00.000Z" }, now)).toBe("inactive");
  });
  it("mengelompokkan promo untuk daftar pengelolaan dan riwayat", () => {
    const groups = groupPromotionsByTimeline([{ id: 1, status: "active" as const, startsAt: "2026-08-28T09:00:00.000Z", endsAt: "2026-08-28T11:00:00.000Z" }, { id: 2, status: "active" as const, startsAt: "2026-08-28T08:00:00.000Z", endsAt: "2026-08-28T09:00:00.000Z" }], now);
    expect(groups.active.map(item => item.id)).toEqual([1]);
    expect(groups.ended.map(item => item.id)).toEqual([2]);
  });
});
