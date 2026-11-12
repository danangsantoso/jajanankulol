export type PromotionCartLine = { productId: number; quantity: number; unitPrice: number };
export type PromotionRule = {
  id: number;
  name: string;
  type: "discount" | "bundle";
  discountType: "percentage" | "fixed" | null;
  discountValue: number | null;
  bundlePrice: number | null;
  items: Array<{ productId: number; quantity: number }>;
};

export type PromotionPricing = {
  subtotal: number;
  discountTotal: number;
  total: number;
  promotionSummary: string | null;
  applied: Array<{ promotionId: number; name: string; amount: number }>;
  lineDiscounts: Record<number, number>;
};

const roundRupiah = (value: number) => Math.max(0, Math.round(value));

function bundleSavings(rule: PromotionRule, cartByProduct: Map<number, PromotionCartLine>) {
  if (!rule.bundlePrice || rule.bundlePrice <= 0 || rule.items.length < 2) return { sets: 0, savingPerSet: 0 };
  const sets = Math.min(...rule.items.map(item => Math.floor((cartByProduct.get(item.productId)?.quantity || 0) / item.quantity)));
  const regularPrice = rule.items.reduce((sum, item) => sum + (cartByProduct.get(item.productId)?.unitPrice || 0) * item.quantity, 0);
  return { sets: Math.max(0, sets), savingPerSet: roundRupiah(regularPrice - rule.bundlePrice) };
}

export function calculatePromotionPricing(cart: PromotionCartLine[], rules: PromotionRule[]): PromotionPricing {
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const cartByProduct = new Map(cart.map(item => [item.productId, item]));
  const remaining = new Map(cart.map(item => [item.productId, item.quantity]));
  const lineDiscounts: Record<number, number> = {};
  const applied: PromotionPricing["applied"] = [];

  const bundles = rules
    .filter(rule => rule.type === "bundle")
    .map(rule => ({ rule, ...bundleSavings(rule, cartByProduct) }))
    .filter(candidate => candidate.sets > 0 && candidate.savingPerSet > 0)
    .sort((a, b) => b.savingPerSet - a.savingPerSet);

  for (const { rule, savingPerSet } of bundles) {
    const sets = Math.min(...rule.items.map(item => Math.floor((remaining.get(item.productId) || 0) / item.quantity)));
    const amount = roundRupiah(sets * savingPerSet);
    if (!sets || !amount) continue;
    rule.items.forEach(item => remaining.set(item.productId, (remaining.get(item.productId) || 0) - sets * item.quantity));
    const regularTotal = rule.items.reduce((sum, item) => sum + (cartByProduct.get(item.productId)?.unitPrice || 0) * item.quantity, 0);
    rule.items.forEach(item => {
      const proportion = ((cartByProduct.get(item.productId)?.unitPrice || 0) * item.quantity) / regularTotal;
      lineDiscounts[item.productId] = roundRupiah((lineDiscounts[item.productId] || 0) + amount * proportion);
    });
    applied.push({ promotionId: rule.id, name: rule.name, amount });
  }

  for (const rule of rules.filter(item => item.type === "discount")) {
    const value = Number(rule.discountValue || 0);
    if (value <= 0) continue;
    let amount = 0;
    for (const ruleItem of rule.items) {
      const line = cartByProduct.get(ruleItem.productId);
      const quantity = remaining.get(ruleItem.productId) || 0;
      if (!line || quantity <= 0) continue;
      const perUnit = rule.discountType === "percentage" ? line.unitPrice * (value / 100) : value;
      const discount = roundRupiah(Math.min(line.unitPrice, perUnit) * quantity);
      lineDiscounts[line.productId] = roundRupiah((lineDiscounts[line.productId] || 0) + discount);
      amount += discount;
    }
    if (amount) applied.push({ promotionId: rule.id, name: rule.name, amount });
  }

  const discountTotal = Math.min(subtotal, Object.values(lineDiscounts).reduce((sum, amount) => sum + amount, 0));
  return { subtotal, discountTotal, total: subtotal - discountTotal, promotionSummary: applied.length ? applied.map(item => `${item.name} (-Rp ${item.amount.toLocaleString("id-ID")})`).join(", ").slice(0, 500) : null, applied, lineDiscounts };
}
