import { describe, expect, it } from "vitest";
import { addSubscriptionDays, getSubscriptionAccess, trialEndsFrom } from "./subscriptionAccess";

describe("akses langganan tenant", () => {
  const now = new Date("2026-08-25T00:00:00.000Z");
  it("memberikan 3 hari masa coba untuk pelanggan baru", () => {
    expect(trialEndsFrom(now).toISOString()).toBe("2026-08-28T00:00:00.000Z");
    expect(getSubscriptionAccess({ status: "trial", trialEndsAt: trialEndsFrom(now) }, now).allowed).toBe(true);
  });
  it("menutup akses trial dan paket setelah berakhir", () => {
    expect(getSubscriptionAccess({ status: "trial", trialEndsAt: new Date("2026-08-24T00:00:00.000Z") }, now).state).toBe("expired");
    expect(getSubscriptionAccess({ status: "active", subscriptionEndsAt: new Date("2026-08-24T00:00:00.000Z") }, now).allowed).toBe(false);
  });
  it("menghitung durasi paket dari tanggal aktivasi", () => {
    expect(addSubscriptionDays(now, 30).toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });
});
