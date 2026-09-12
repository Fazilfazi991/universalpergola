import "server-only";

import type { AdminCategory, AdminProduct } from "@/lib/catalogue/admin-queries";
import type { CatalogueProduct } from "@/lib/catalogue/types";

export const fixtureCategories: AdminCategory[] = [
  { id: "550e8400-e29b-41d4-a716-446655440000", name: "Adjustable shade systems", slug: "adjustable-shade-systems", description: "Architectural systems with controllable overhead shade.", long_description: "A temporary development fixture used only to review Phase 2A interface behavior.", image_storage_path: null, image_alt_text: null, image_url: null, is_active: true, sort_order: 10, seo_title: "", seo_description: "", archived_at: null, updated_at: "2026-09-12T10:00:00.000Z" },
  { id: "9d8c6f8b-4c6b-4e30-8c35-5ad98fa2e555", name: "Fixed roof structures", slug: "fixed-roof-structures", description: "Permanent shelter structures.", long_description: null, image_storage_path: null, image_alt_text: null, image_url: null, is_active: false, sort_order: 20, seo_title: null, seo_description: null, archived_at: null, updated_at: "2026-09-11T10:00:00.000Z" },
];

export const fixtureProduct: AdminProduct = {
  id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8", category_id: fixtureCategories[0].id,
  name: "Architectural louver system", slug: "architectural-louver-system", product_code: "UP-AL-01",
  short_description: "A configurable aluminium shade system for considered outdoor spaces.",
  full_description: "Designed for residential terraces and hospitality settings with clean drainage integration.",
  specifications: { Operation: "Motorised", Drainage: "Integrated", Warranty: "Project specific" },
  material: "Powder-coated aluminium", colour_information: "Project palette", dimensions_information: "Configured to site",
  pricing_mode: "starting_price", price: 12500, currency: "AED", is_featured: true, is_published: false,
  sort_order: 10, seo_title: "", seo_description: "", archived_at: null, updated_at: "2026-09-12T10:00:00.000Z",
  category: { id: fixtureCategories[0].id, name: fixtureCategories[0].name, slug: fixtureCategories[0].slug, is_active: true }, images: [],
};

const fixtureCatalogueProduct: CatalogueProduct = {
  id: fixtureProduct.id, name: fixtureProduct.name, slug: fixtureProduct.slug, product_code: fixtureProduct.product_code,
  short_description: fixtureProduct.short_description, pricing_mode: fixtureProduct.pricing_mode, price: fixtureProduct.price,
  currency: fixtureProduct.currency, is_featured: fixtureProduct.is_featured, category: fixtureProduct.category!, images: fixtureProduct.images,
};

export const fixtureCatalogueProducts: CatalogueProduct[] = [fixtureCatalogueProduct, {
  ...fixtureCatalogueProduct, id: "56a3e2f1-2db1-46d2-a715-116b1b99be21", name: "Linear canopy", slug: "linear-canopy",
  product_code: "UP-LC-02", pricing_mode: "price_on_request", price: null, is_featured: false,
}];
