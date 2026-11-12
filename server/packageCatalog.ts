export type PackageTier = "bronze" | "silver" | "gold" | "platinum";

export type PackageTemplate = {
  name: string;
  tier: PackageTier;
  durationDays: number;
  branchLimit: number;
  cashierLimit: number;
  regularPrice: number;
  salePrice: number | null;
  availability: "available" | "coming_soon";
  sortOrder: number;
};

const durationLabel = (days: number) => days === 365 ? "12 Bulan" : `${days / 30} Bulan`;

const tierRows = [
  { tier: "bronze" as const, branchLimit: 2, cashierLimit: 2, prices: [[30, 357000, 257000], [90, 1071000, 699000], [180, 2142000, 1299000], [365, 4284000, 2399000]] },
  { tier: "silver" as const, branchLimit: 5, cashierLimit: 10, prices: [[30, 597000, 397000], [90, 1791000, 1099000], [180, 3582000, 2099000], [365, 7164000, 3899000]] },
  { tier: "gold" as const, branchLimit: 10, cashierLimit: 25, prices: [[30, 997000, 697000], [90, 2991000, 1899000], [180, 5982000, 3599000], [365, 11964000, 6599000]] },
];

const availablePackages: PackageTemplate[] = tierRows.flatMap((row, tierIndex) => row.prices.map(([durationDays, regularPrice, salePrice]) => ({
  name: `${row.tier[0].toUpperCase()}${row.tier.slice(1)} ${durationLabel(durationDays)}`,
  tier: row.tier,
  durationDays,
  branchLimit: row.branchLimit,
  cashierLimit: row.cashierLimit,
  regularPrice,
  salePrice,
  availability: "available" as const,
  sortOrder: tierIndex * 1000 + durationDays,
})));

export const DEFAULT_PACKAGE_CATALOG: PackageTemplate[] = [
  ...availablePackages,
  { name: "Platinum · Coming Soon", tier: "platinum", durationDays: 30, branchLimit: 25, cashierLimit: 75, regularPrice: 0, salePrice: null, availability: "coming_soon", sortOrder: 3030 },
];
