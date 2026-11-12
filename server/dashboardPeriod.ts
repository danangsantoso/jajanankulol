export const dashboardPeriods = ["daily", "weekly", "monthly"] as const;
export type DashboardPeriod = (typeof dashboardPeriods)[number];

export function getDashboardPeriodRange(period: DashboardPeriod, reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(start);
  const labels: Record<DashboardPeriod, string> = { daily: "Hari ini", weekly: "Minggu ini", monthly: "Bulan ini" };

  if (period === "weekly") {
    const weekday = start.getDay() || 7;
    start.setDate(start.getDate() - weekday + 1);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else if (period === "monthly") {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setDate(end.getDate() + 1);
  }

  return { start, end, label: labels[period] };
}

type DatedRecord = { paidAt: Date };
type SaleRecord = DatedRecord & { total: string | number };
type SoldItemRecord = DatedRecord & { productName: string; quantity: number };

function isInsideRange(record: DatedRecord, start: Date, end: Date) {
  return record.paidAt >= start && record.paidAt < end;
}

export function summarizeDashboardSales<T extends DatedRecord>(
  range: { start: Date; end: Date; label: string },
  transactions: SaleRecord[],
  soldItems: SoldItemRecord[],
  recentTransactions: T[],
) {
  const filteredTransactions = transactions.filter(record => isInsideRange(record, range.start, range.end));
  const filteredItems = soldItems.filter(record => isInsideRange(record, range.start, range.end));
  const topItemMap = new Map<string, number>();
  filteredItems.forEach(item => topItemMap.set(item.productName, (topItemMap.get(item.productName) || 0) + item.quantity));
  return {
    periodSales: filteredTransactions.reduce((sum, transaction) => sum + Number(transaction.total), 0),
    periodTransactions: filteredTransactions.length,
    periodLabel: range.label,
    topItems: Array.from(topItemMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })),
    recentTransactions: recentTransactions.filter(record => isInsideRange(record, range.start, range.end)),
  };
}
