import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_MEDIA_BUCKET, PRODUCT_MEDIA_BUCKET } from "@/lib/catalogue/media";
import type { CatalogueProduct, CatalogueProductDetail, CategorySummary, DataResult } from "@/lib/catalogue/types";

const productListSelect = `id, name, slug, product_code, short_description, pricing_mode, price, currency, is_featured, category:product_categories!inner(id, name, slug, is_active, archived_at), images:product_images(id, storage_path, alt_text, is_primary, sort_order)`;
const productDetailSelect = `id, name, slug, product_code, short_description, full_description, specifications, material, colour_information, dimensions_information, pricing_mode, price, currency, is_featured, seo_title, seo_description, category:product_categories!inner(id, name, slug, is_active, archived_at), images:product_images(id, storage_path, alt_text, is_primary, sort_order)`;

function cleanSearch(value?: string) {
  return value?.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ") || "";
}

async function signPaths(supabase: SupabaseClient, bucket: string, paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const uniquePaths = [...new Set(paths)];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, 3600);
  if (error) {
    console.error(`Unable to sign ${bucket} media:`, error.message);
    return new Map<string, string>();
  }
  return new Map((data || []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}

async function withProductImageUrls(supabase: SupabaseClient, products: CatalogueProduct[]) {
  const paths = products.flatMap((product) => product.images.map((image) => image.storage_path));
  const urls = await signPaths(supabase, PRODUCT_MEDIA_BUCKET, paths);
  return products.map((product) => ({
    ...product,
    images: product.images
      .map((image) => ({ ...image, url: urls.get(image.storage_path) || null }))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order),
  }));
}

export async function getActiveCategories(): Promise<DataResult<CategorySummary[]>> {
  const supabase = await createClient();
  if (!supabase) return { configured: false, data: [] };
  const { data, error } = await supabase.from("product_categories")
    .select("id, name, slug, description, long_description, image_storage_path, image_alt_text, sort_order, seo_title, seo_description")
    .eq("is_active", true).is("archived_at", null).order("sort_order").order("name").limit(100);
  if (error) return { configured: true, data: [], error: error.message };
  const categories = (data || []) as CategorySummary[];
  const paths = categories.flatMap((item) => item.image_storage_path || []);
  const urls = await signPaths(supabase, CATEGORY_MEDIA_BUCKET, paths);
  return { configured: true, data: categories.map((category) => ({
    ...category,
    image_url: category.image_storage_path ? urls.get(category.image_storage_path) || null : null,
  })) };
}

export async function getPublishedProducts(filters: { search?: string; category?: string; limit?: number } = {}): Promise<DataResult<CatalogueProduct[]>> {
  const supabase = await createClient();
  if (!supabase) return { configured: false, data: [] };
  let query = supabase.from("products").select(productListSelect)
    .eq("is_published", true).is("archived_at", null)
    .eq("category.is_active", true).is("category.archived_at", null)
    .order("is_featured", { ascending: false }).order("sort_order").order("name")
    .limit(Math.min(filters.limit || 60, 100));
  const search = cleanSearch(filters.search);
  if (search) query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`);
  if (filters.category) query = query.eq("category.slug", filters.category.slice(0, 96));
  const { data, error } = await query;
  if (error) return { configured: true, data: [], error: error.message };
  const products = (data || []) as unknown as CatalogueProduct[];
  return { configured: true, data: await withProductImageUrls(supabase, products) };
}

export const getPublishedProduct = cache(async (slug: string): Promise<DataResult<CatalogueProductDetail | null>> => {
  const supabase = await createClient();
  if (!supabase) return { configured: false, data: null };
  const { data, error } = await supabase.from("products").select(productDetailSelect)
    .eq("slug", slug.slice(0, 96)).eq("is_published", true).is("archived_at", null)
    .eq("category.is_active", true).is("category.archived_at", null).maybeSingle();
  if (error) return { configured: true, data: null, error: error.message };
  if (!data) return { configured: true, data: null };
  const [product] = await withProductImageUrls(supabase, [data as unknown as CatalogueProductDetail]);
  return { configured: true, data: product as CatalogueProductDetail };
});

export const getPublishedProductsByCategory = cache(async (categorySlug: string) => {
  const supabase = await createClient();
  if (!supabase) return { configured: false, category: null, products: [] as CatalogueProduct[] };
  const { data: category, error: categoryError } = await supabase.from("product_categories")
    .select("id, name, slug, description, long_description, image_storage_path, image_alt_text, seo_title, seo_description")
    .eq("slug", categorySlug.slice(0, 96)).eq("is_active", true).is("archived_at", null).maybeSingle();
  if (categoryError || !category) return { configured: true, category: null, products: [] as CatalogueProduct[], error: categoryError?.message };
  const productResult = await getPublishedProducts({ category: categorySlug });
  const urls = await signPaths(supabase, CATEGORY_MEDIA_BUCKET, category.image_storage_path ? [category.image_storage_path] : []);
  return {
    configured: true,
    category: { ...category, image_url: category.image_storage_path ? urls.get(category.image_storage_path) || null : null } as CategorySummary,
    products: productResult.data,
    error: productResult.error,
  };
});
