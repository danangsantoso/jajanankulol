import { DashboardPeriod } from "@/lib/dashboardFilter";
import React from "react";

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
];

export default function DashboardPeriodFilter({ period, onChange }: { period: DashboardPeriod; onChange: (period: DashboardPeriod) => void }) {
  return <div aria-label="Filter periode laporan" className="grid w-full grid-cols-3 rounded-xl border bg-muted/50 p-1 sm:w-auto">{periodOptions.map(option => <button key={option.value} onClick={() => onChange(option.value)} aria-pressed={period === option.value} className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm ${period === option.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{option.label}</button>)}</div>;
}
