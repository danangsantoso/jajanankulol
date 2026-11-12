import { describe, expect, it } from "vitest";
import { getDashboardPeriodRange, summarizeDashboardSales } from "./dashboardPeriod";

describe("rentang periode dashboard", () => {
  const reference = new Date(2026, 7, 26, 14, 30, 0);

  it("membatasi laporan harian dari awal hari sampai awal hari berikutnya", () => {
    const range = getDashboardPeriodRange("daily", reference);
    expect(range.start).toEqual(new Date(2026, 7, 26));
    expect(range.end).toEqual(new Date(2026, 7, 27));
  });

  it("memulai minggu pada Senin dan mengakhiri rentang secara eksklusif", () => {
    const range = getDashboardPeriodRange("weekly", reference);
    expect(range.start).toEqual(new Date(2026, 7, 24));
    expect(range.end).toEqual(new Date(2026, 7, 31));
  });

  it("membatasi laporan bulanan dari tanggal satu hingga bulan berikutnya", () => {
    const range = getDashboardPeriodRange("monthly", reference);
    expect(range.start).toEqual(new Date(2026, 7, 1));
    expect(range.end).toEqual(new Date(2026, 8, 1));
  });

  it("mengagregasi omzet, transaksi, produk terlaris, dan transaksi terbaru sesuai periode", () => {
    const transactions = [
      { total: "20000", paidAt: new Date(2026, 7, 26, 9) },
      { total: "15000", paidAt: new Date(2026, 7, 25, 9) },
      { total: "5000", paidAt: new Date(2026, 7, 1, 9) },
    ];
    const items = [
      { productName: "Kerupuk", quantity: 2, paidAt: new Date(2026, 7, 26, 9) },
      { productName: "Kerupuk", quantity: 1, paidAt: new Date(2026, 7, 26, 10) },
      { productName: "Es teh", quantity: 4, paidAt: new Date(2026, 7, 25, 9) },
    ];
    const recent = transactions.map((transaction, index) => ({ ...transaction, id: index + 1 }));
    const daily = summarizeDashboardSales(getDashboardPeriodRange("daily", reference), transactions, items, recent);
    const weekly = summarizeDashboardSales(getDashboardPeriodRange("weekly", reference), transactions, items, recent);
    const monthly = summarizeDashboardSales(getDashboardPeriodRange("monthly", reference), transactions, items, recent);
    expect(daily).toMatchObject({ periodSales: 20000, periodTransactions: 1, topItems: [{ name: "Kerupuk", quantity: 3 }], recentTransactions: [{ id: 1 }] });
    expect(weekly).toMatchObject({ periodSales: 35000, periodTransactions: 2, topItems: [{ name: "Es teh", quantity: 4 }, { name: "Kerupuk", quantity: 3 }] });
    expect(monthly).toMatchObject({ periodSales: 40000, periodTransactions: 3 });
  });
});
