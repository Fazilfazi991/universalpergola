import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_MEDIA_BUCKET, PRODUCT_MEDIA_BUCKET } from "@/lib/catalogue/media";
import type { CategorySummary, PricingMode, ProductImage } from "@/lib/catalogue/types";

export type AdminCategory = Required<Pick<CategorySummary, "id" | "name" | "slug">> & {
  description: string | null; long_description: string | null; image_storage_path: string | null;
  image_alt_text: string | null; image_url: string | null; is_active: boolean; sort_order: number;
  seo_title: string | null; seo_description: string | null; archived_at: string | null; updated_at: string;
};

export type AdminProduct = {
  id: string; category_id: string; name: string; slug: string; product_code: string | null;
  short_description: string | null; full_description: string | null; specifications: Record<string, string>;
  material: string | null; colour_information: string | null; dimensions_information: string | null;
  pricing_mode: PricingMode; price: number | null; currency: string; is_featured: boolean;
  is_published: boolean; sort_order: number; seo_title: string | null; seo_description: string | null;
  archived_at: string | null; updated_at: string;
  category: { id: string; name: string; slug: string; is_active: boolean } | null;
  images: ProductImage[];
};

function cleanSearch(value?: string) { return value?.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ") || ""; }

async function signedUrl(supabase: SupabaseClient, bucket: string, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function getAdminCategories(filters: { search?: string; state?: string } = {}) {
  const supabase = await createClient();
  if (!supabase) return [] as AdminCategory[];
  let query = supabase.from("product_categories")
    .select("id, name, slug, description, long_description, image_storage_path, image_alt_text, is_active, sort_order, seo_title, seo_description, archived_at, updated_at")
    .order("sort_order").order("name").limit(100);
  const search = cleanSearch(filters.search);
  if (search) query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  if (filters.state === "active") query = query.eq("is_active", true).is("archived_at", null);
  if (filters.state === "inactive") query = query.eq("is_active", false).is("archived_at", null);
  if (filters.state === "archived") query = query.not("archived_at", "is", null);
  if (!filters.state) query = query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load categories: ${error.message}`);
  return (data || []) as AdminCategory[];
}

export async function getAdminCategory(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("product_categories")
    .select("id, name, slug, description, long_description, image_storage_path, image_alt_text, is_active, sort_order, seo_title, seo_description, archived_at, updated_at")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(`Unable to load category: ${error.message}`);
  if (!data) return null;
  return { ...data, image_url: await signedUrl(supabase, CATEGORY_MEDIA_BUCKET, data.image_storage_path) } as AdminCategory;
}

export async function getCategoryOptions() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("product_categories").select("id, name, is_active")
    .is("archived_at", null).order("sort_order").order("name").limit(100);
  if (error) throw new Error(`Unable to load category options: ${error.message}`);
  return data || [];
}

export async function getAdminProducts(filters: { search?: string; category?: string; published?: string; featured?: string; state?: string } = {}) {
  const supabase = await createClient();
  if (!supabase) return [] as AdminProduct[];
  let query = supabase.from("products")
    .select(`id, category_id, name, slug, product_code, short_description, full_description, specifications, material, colour_information, dimensions_information, pricing_mode, price, currency, is_featured, is_published, sort_order, seo_title, seo_description, archived_at, updated_at, category:product_categories(id, name, slug, is_active), images:product_images(id, storage_path, alt_text, is_primary, sort_order)`)
    .order("updated_at", { ascending: false }).limit(100);
  const search = cleanSearch(filters.search);
  if (search) query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.published === "published") query = query.eq("is_published", true);
  if (filters.published === "draft") query = query.eq("is_published", false);
  if (filters.featured === "featured") query = query.eq("is_featured", true);
  if (filters.featured === "standard") query = query.eq("is_featured", false);
  if (filters.state === "archived") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load products: ${error.message}`);
  const products = (data || []) as unknown as AdminProduct[];
  const paths = products.flatMap((product) => product.images.map((image) => image.storage_path));
  const signedResult = paths.length ? await supabase.storage.from(PRODUCT_MEDIA_BUCKET).createSignedUrls([...new Set(paths)], 3600) : { data: [] };
  const urlMap = new Map((signedResult.data || []).map((item) => [item.path, item.signedUrl]));
  return products.map((product) => ({ ...product, images: product.images
    .map((image) => ({ ...image, url: urlMap.get(image.storage_path) || null }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order) }));
}

export async function getAdminProduct(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("products")
    .select(`id, category_id, name, slug, product_code, short_description, full_description, specifications, material, colour_information, dimensions_information, pricing_mode, price, currency, is_featured, is_published, sort_order, seo_title, seo_description, archived_at, updated_at, category:product_categories(id, name, slug, is_active), images:product_images(id, storage_path, alt_text, is_primary, sort_order)`)
    .eq("id", id).maybeSingle();
  if (error) throw new Error(`Unable to load product: ${error.message}`);
  if (!data) return null;
  const product = data as unknown as AdminProduct;
  const paths = product.images.map((image) => image.storage_path);
  const signedResult = paths.length ? await supabase.storage.from(PRODUCT_MEDIA_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const urlMap = new Map((signedResult.data || []).map((item) => [item.path, item.signedUrl]));
  return { ...product, images: product.images.map((image) => ({ ...image, url: urlMap.get(image.storage_path) || null }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order) };
}
