import { createClient } from "@/lib/supabase/server";

export type CatalogueProduct = {
  id: string; name: string; slug: string; product_code: string | null; short_description: string | null;
  pricing_mode: "hidden" | "starting_price" | "fixed_price" | "price_on_request"; price: number | null;
  category: { name: string; slug: string } | null;
};

export type CatalogueProductDetail = CatalogueProduct & {
  full_description: string | null;
  specifications: Record<string, unknown>;
  material: string | null;
  colour_information: string | null;
  dimensions_information: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export async function getPublishedProducts(limit?: number): Promise<CatalogueProduct[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase.from("products").select("id, name, slug, product_code, short_description, pricing_mode, price, category:product_categories(name, slug)").eq("is_published", true).is("archived_at", null).order("sort_order").order("name");
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) { console.error("Unable to load published catalogue products:", error.message); return []; }
  return (data || []) as unknown as CatalogueProduct[];
}

export async function getPublishedProduct(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("products").select("id, name, slug, product_code, short_description, full_description, pricing_mode, price, specifications, material, colour_information, dimensions_information, seo_title, seo_description, category:product_categories(name, slug)").eq("slug", slug).eq("is_published", true).is("archived_at", null).maybeSingle();
  if (error) { console.error("Unable to load published product:", error.message); return null; }
  return data as unknown as CatalogueProductDetail | null;
}

export async function getPublishedProductsByCategory(categorySlug: string) {
  const supabase = await createClient();
  if (!supabase) return { category: null, products: [] as CatalogueProduct[] };

  const { data: category } = await supabase.from("product_categories").select("id, name, slug, description").eq("slug", categorySlug).eq("is_active", true).is("archived_at", null).maybeSingle();
  if (!category) return { category: null, products: [] as CatalogueProduct[] };

  const { data, error } = await supabase.from("products").select("id, name, slug, product_code, short_description, pricing_mode, price, category:product_categories(name, slug)").eq("category_id", category.id).eq("is_published", true).is("archived_at", null).order("sort_order").order("name");
  if (error) { console.error("Unable to load product category:", error.message); return { category, products: [] as CatalogueProduct[] }; }
  return { category, products: (data || []) as unknown as CatalogueProduct[] };
}
