"use server";

import { redirect } from "next/navigation";
import { requireManagement } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { productSchema, type ProductInput } from "@/lib/catalogue/validation";
import { PRODUCT_MEDIA_BUCKET, createMediaPath, isUuid, validateImageFile } from "@/lib/catalogue/media";
import { databaseError, nullable, revalidateCatalogue, text } from "@/lib/catalogue/action-helpers";
import type { ActionState } from "@/lib/forms/action-state";

function productValues(formData: FormData) {
  return {
    name: text(formData, "name"), slug: text(formData, "slug"), product_code: text(formData, "product_code"),
    category_id: text(formData, "category_id"), short_description: text(formData, "short_description"),
    full_description: text(formData, "full_description"), material: text(formData, "material"),
    colour_information: text(formData, "colour_information"), dimensions_information: text(formData, "dimensions_information"),
    specifications: text(formData, "specifications") || "{}", pricing_mode: text(formData, "pricing_mode"),
    price: text(formData, "price"), is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on", sort_order: text(formData, "sort_order"),
    seo_title: text(formData, "seo_title"), seo_description: text(formData, "seo_description"),
  };
}

function productPayload(input: ProductInput, createdBy?: string) {
  return {
    name: input.name, slug: input.slug, product_code: nullable(input.product_code), category_id: input.category_id,
    short_description: nullable(input.short_description), full_description: nullable(input.full_description),
    material: nullable(input.material), colour_information: nullable(input.colour_information),
    dimensions_information: nullable(input.dimensions_information), specifications: input.specifications,
    pricing_mode: input.pricing_mode, price: ["hidden", "price_on_request"].includes(input.pricing_mode) ? null : input.price,
    currency: "AED", is_featured: input.is_featured, is_published: input.is_published,
    sort_order: input.sort_order, seo_title: nullable(input.seo_title), seo_description: nullable(input.seo_description),
    ...(createdBy ? { created_by: createdBy } : {}),
  };
}

async function categoryCanPublish(categoryId: string) {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase.from("product_categories").select("is_active, archived_at").eq("id", categoryId).maybeSingle();
  return Boolean(data?.is_active && !data.archived_at);
}

export async function createProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireManagement();
  const parsed = productSchema.safeParse(productValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.is_published && !(await categoryCanPublish(parsed.data.category_id))) {
    return { status: "error", message: "Activate the selected category before publishing this product." };
  }
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const payload = { ...productPayload(parsed.data, profile.id), published_at: parsed.data.is_published ? new Date().toISOString() : null };
  const { data, error } = await supabase.from("products").insert(payload).select("id").single();
  if (error) return databaseError(error, "product");
  revalidateCatalogue(parsed.data.slug);
  redirect(`/dashboard/products/${data.id}/edit?created=1`);
}

export async function updateProductAction(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireManagement();
  if (!isUuid(id)) return { status: "error", message: "Invalid product identifier." };
  const parsed = productSchema.safeParse(productValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.is_published && !(await categoryCanPublish(parsed.data.category_id))) {
    return { status: "error", message: "Activate the selected category before publishing this product." };
  }
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data: current } = await supabase.from("products").select("is_published, published_at").eq("id", id).maybeSingle();
  if (!current) return { status: "error", message: "Product not found." };
  const publishedAt = parsed.data.is_published ? (current.is_published ? current.published_at : new Date().toISOString()) : null;
  const { error } = await supabase.from("products").update({ ...productPayload(parsed.data), published_at: publishedAt }).eq("id", id);
  if (error) return databaseError(error, "product");
  revalidateCatalogue(parsed.data.slug);
  return { status: "success", message: "Product changes saved." };
}

export async function setProductPublishedAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  const publish = text(formData, "published") === "true";
  if (!isUuid(id)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data: product } = await supabase.from("products").select("category_id, slug").eq("id", id).maybeSingle();
  if (!product) return;
  if (publish && !(await categoryCanPublish(product.category_id))) throw new Error("Activate the product category before publishing.");
  const { error } = await supabase.from("products").update({ is_published: publish, published_at: publish ? new Date().toISOString() : null }).eq("id", id).is("archived_at", null);
  if (error) throw new Error("Unable to update publication status.");
  revalidateCatalogue(product.slug);
}

export async function archiveProductAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  if (!isUuid(id)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data, error } = await supabase.from("products")
    .update({ is_published: false, published_at: null, archived_at: new Date().toISOString() })
    .eq("id", id).select("slug").single();
  if (error) throw new Error("Unable to archive product.");
  revalidateCatalogue(data.slug);
}

export async function uploadProductImageAction(productId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireManagement();
  if (!isUuid(productId)) return { status: "error", message: "Invalid product identifier." };
  const file = formData.get("image");
  if (!(file instanceof File)) return { status: "error", message: "Choose an image." };
  const validationError = validateImageFile(file);
  if (validationError) return { status: "error", message: validationError };
  const altText = text(formData, "alt_text").trim();
  if (altText.length > 180) return { status: "error", message: "Alt text must be 180 characters or fewer." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data: product } = await supabase.from("products").select("id, slug").eq("id", productId).maybeSingle();
  if (!product) return { status: "error", message: "Product not found." };
  const path = createMediaPath(productId, file.type);
  const upload = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (upload.error) return { status: "error", message: `Image upload failed: ${upload.error.message}` };
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { data: image, error } = await supabase.from("product_images").insert({
    product_id: productId, storage_path: path, alt_text: nullable(altText), is_primary: false,
    sort_order: (count || 0) * 10, created_by: profile.id,
  }).select("id").single();
  if (error) {
    await supabase.storage.from(PRODUCT_MEDIA_BUCKET).remove([path]);
    return databaseError(error, "product image");
  }
  if ((count || 0) === 0 || formData.get("is_primary") === "on") {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    const primary = await supabase.from("product_images").update({ is_primary: true }).eq("id", image.id);
    if (primary.error) return { status: "error", message: "Image uploaded, but the cover image could not be updated." };
  }
  revalidateCatalogue(product.slug);
  return { status: "success", message: "Product image uploaded." };
}

export async function updateProductImageAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  const productId = text(formData, "product_id");
  const altText = text(formData, "alt_text").trim();
  const sortOrder = Number(text(formData, "sort_order"));
  if (!isUuid(id) || !isUuid(productId) || altText.length > 180 || !Number.isInteger(sortOrder) || sortOrder < -10000 || sortOrder > 10000) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.from("product_images").update({ alt_text: nullable(altText), sort_order: sortOrder }).eq("id", id).eq("product_id", productId);
  if (error) throw new Error("Unable to update image details.");
  revalidateCatalogue();
}

export async function setPrimaryProductImageAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  const productId = text(formData, "product_id");
  if (!isUuid(id) || !isUuid(productId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", id).eq("product_id", productId);
  if (error) throw new Error("Unable to set the cover image.");
  revalidateCatalogue();
}

export async function removeProductImageAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  const productId = text(formData, "product_id");
  if (!isUuid(id) || !isUuid(productId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data: image } = await supabase.from("product_images").select("storage_path, is_primary").eq("id", id).eq("product_id", productId).maybeSingle();
  if (!image) return;
  const { error } = await supabase.from("product_images").delete().eq("id", id).eq("product_id", productId);
  if (error) throw new Error("Unable to remove image metadata.");
  await supabase.storage.from(PRODUCT_MEDIA_BUCKET).remove([image.storage_path]);
  if (image.is_primary) {
    const { data: next } = await supabase.from("product_images").select("id").eq("product_id", productId).order("sort_order").limit(1).maybeSingle();
    if (next) await supabase.from("product_images").update({ is_primary: true }).eq("id", next.id);
  }
  revalidateCatalogue();
}
