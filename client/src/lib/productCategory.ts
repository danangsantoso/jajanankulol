export type CategorizedProduct = { category?: string | null };

export const ALL_PRODUCT_CATEGORIES = "Semua";

export function getProductCategory(product: CategorizedProduct) {
  return product.category?.trim() || "Lainnya";
}

export function listProductCategories(products: CategorizedProduct[]) {
  return [ALL_PRODUCT_CATEGORIES, ...Array.from(new Set(products.map(getProductCategory)))];
}

export function filterProductsByCategory<T extends CategorizedProduct>(products: T[], category: string) {
  if (category === ALL_PRODUCT_CATEGORIES) return products;
  return products.filter(product => getProductCategory(product) === category);
}

export function filterProductsForCatalog<T extends CategorizedProduct & { name: string; qrCode?: string }>(products: T[], category: string, searchTerm: string) {
  const categoryFiltered = filterProductsByCategory(products, category);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("id-ID");
  if (!normalizedSearch) return categoryFiltered;
  return categoryFiltered.filter(product => `${product.name} ${product.qrCode ?? ""}`.toLocaleLowerCase("id-ID").includes(normalizedSearch));
}
