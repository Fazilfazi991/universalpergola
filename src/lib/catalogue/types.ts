export type PricingMode = "hidden" | "starting_price" | "fixed_price" | "price_on_request";

export type ProductImage = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  url: string | null;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description?: string | null;
  image_storage_path?: string | null;
  image_alt_text?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  archived_at?: string | null;
  updated_at?: string;
};

export type CatalogueProduct = {
  id: string;
  name: string;
  slug: string;
  product_code: string | null;
  short_description: string | null;
  pricing_mode: PricingMode;
  price: number | null;
  currency: string;
  is_featured: boolean;
  category: Pick<CategorySummary, "id" | "name" | "slug">;
  images: ProductImage[];
};

export type CatalogueProductDetail = CatalogueProduct & {
  full_description: string | null;
  specifications: Record<string, string>;
  material: string | null;
  colour_information: string | null;
  dimensions_information: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export type DataResult<T> = {
  configured: boolean;
  data: T;
  error?: string;
};
