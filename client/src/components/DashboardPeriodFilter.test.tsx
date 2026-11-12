import { fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { dashboardQueryFor, DashboardPeriod } from "@/lib/dashboardFilter";
import DashboardPeriodFilter from "./DashboardPeriodFilter";

function FilterHarness() {
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  return <><DashboardPeriodFilter period={period} onChange={setPeriod} /><output data-testid="query-period">{dashboardQueryFor(period).period}</output></>;
}

describe("DashboardPeriodFilter", () => {
  it("mengubah input kueri saat admin memilih harian, mingguan, atau bulanan", () => {
    render(<FilterHarness />);
    expect(screen.getByTestId("query-period").textContent).toBe("daily");
    fireEvent.click(screen.getByRole("button", { name: "Mingguan" }));
    expect(screen.getByTestId("query-period").textContent).toBe("weekly");
    fireEvent.click(screen.getByRole("button", { name: "Bulanan" }));
    expect(screen.getByTestId("query-period").textContent).toBe("monthly");
    fireEvent.click(screen.getByRole("button", { name: "Harian" }));
    expect(screen.getByTestId("query-period").textContent).toBe("daily");
  });
});
