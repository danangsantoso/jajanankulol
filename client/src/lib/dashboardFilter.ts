export type DashboardPeriod = "daily" | "weekly" | "monthly";

export function dashboardQueryFor(period: DashboardPeriod) {
  return { period };
}
