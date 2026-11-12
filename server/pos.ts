export type CheckoutLine = {
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export function calculateCheckout(lines: CheckoutLine[]) {
  return lines.reduce(
    (total, line) => {
      const lineRevenue = line.quantity * line.unitPrice;
      const lineCost = line.quantity * line.unitCost;
      return {
        subtotal: total.subtotal + lineRevenue,
        cost: total.cost + lineCost,
        profit: total.profit + lineRevenue - lineCost,
      };
    },
    { subtotal: 0, cost: 0, profit: 0 },
  );
}

export function calculateChange(total: number, amountReceived?: number) {
  if (amountReceived === undefined) return 0;
  if (amountReceived < total) {
    throw new Error("Uang tunai yang diterima belum mencukupi.");
  }
  return amountReceived - total;
}

export function calculateNextStock(currentStock: number, delta: number) {
  const nextStock = currentStock + delta;
  if (nextStock < 0) throw new Error("Stok tidak mencukupi.");
  return nextStock;
}

export function requireQrisProof(paymentMethod: "cash" | "qris", proofUrl?: string) {
  if (paymentMethod === "qris" && !proofUrl) {
    throw new Error("Unggah foto bukti transfer sebelum melunasi pembayaran QRIS.");
  }
}

export function calculateFinanceSummary(
  transactions: Array<{ total: number; paymentMethod: "cash" | "qris" }>,
  itemCosts: Array<{ quantity: number; unitCost: number }>,
) {
  const revenue = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
  const cost = itemCosts.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  return {
    revenue,
    cost,
    profit: revenue - cost,
    transactions: transactions.length,
    paymentBreakdown: {
      cash: transactions.filter(transaction => transaction.paymentMethod === "cash").reduce((sum, transaction) => sum + transaction.total, 0),
      qris: transactions.filter(transaction => transaction.paymentMethod === "qris").reduce((sum, transaction) => sum + transaction.total, 0),
    },
  };
}
