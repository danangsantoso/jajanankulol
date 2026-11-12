import { describe, expect, it } from "vitest";
import { dashboardQueryFor } from "./dashboardFilter";

describe("input filter dashboard", () => {
  it("mengirim periode yang dipilih admin sebagai input kueri baru", () => {
    expect(dashboardQueryFor("daily")).toEqual({ period: "daily" });
    expect(dashboardQueryFor("weekly")).toEqual({ period: "weekly" });
    expect(dashboardQueryFor("monthly")).toEqual({ period: "monthly" });
  });
});
