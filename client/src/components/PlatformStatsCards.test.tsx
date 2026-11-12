import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import PlatformStatsCards from "./PlatformStatsCards";

describe("kartu statistik platform", () => {
  it("menampilkan jumlah tenant dan pengguna aktif beserta komposisi role", () => {
    render(<PlatformStatsCards stats={{ tenants: { total: 5, active: 3, trial: 2, suspended: 1 }, users: { total: 12, active: 10, superadmin: 1, adminUtama: 3, adminCabang: 2, kasir: 4 } }} />);
    expect(screen.getByText("Total tenant")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("Pengguna aktif")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("3 admin utama")).toBeTruthy();
    expect(screen.getByText("2 admin cabang · 4 kasir")).toBeTruthy();
  });
});
