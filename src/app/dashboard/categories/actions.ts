"use server";

import { redirect } from "next/navigation";
import { requireManagement } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/catalogue/validation";
import { CATEGORY_MEDIA_BUCKET, createMediaPath, isUuid, validateImageFile } from "@/lib/catalogue/media";
import { databaseError, nullable, revalidateCatalogue, text } from "@/lib/catalogue/action-helpers";
import type { ActionState } from "@/lib/forms/action-state";

function categoryValues(formData: FormData) {
  return {
    name: text(formData, "name"), slug: text(formData, "slug"),
    description: text(formData, "description"), long_description: text(formData, "long_description"),
    image_alt_text: text(formData, "image_alt_text"), is_active: formData.get("is_active") === "on",
    sort_order: text(formData, "sort_order"), seo_title: text(formData, "seo_title"),
    seo_description: text(formData, "seo_description"),
  };
}

function categoryPayload(input: ReturnType<typeof categorySchema.parse>, createdBy?: string) {
  return {
    name: input.name, slug: input.slug, description: nullable(input.description),
    long_description: nullable(input.long_description), image_alt_text: nullable(input.image_alt_text),
    is_active: input.is_active, sort_order: input.sort_order, seo_title: nullable(input.seo_title),
    seo_description: nullable(input.seo_description), ...(createdBy ? { created_by: createdBy } : {}),
  };
}

export async function createCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireManagement();
  const parsed = categorySchema.safeParse(categoryValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data, error } = await supabase.from("product_categories").insert(categoryPayload(parsed.data, profile.id)).select("id").single();
  if (error) return databaseError(error, "category");
  revalidateCatalogue(undefined, parsed.data.slug);
  redirect(`/dashboard/categories/${data.id}/edit?created=1`);
}

export async function updateCategoryAction(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireManagement();
  if (!isUuid(id)) return { status: "error", message: "Invalid category identifier." };
  const parsed = categorySchema.safeParse(categoryValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("product_categories").update(categoryPayload(parsed.data)).eq("id", id);
  if (error) return databaseError(error, "category");
  revalidateCatalogue(undefined, parsed.data.slug);
  return { status: "success", message: "Category changes saved." };
}

export async function setCategoryActiveAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  if (!isUuid(id)) return;
  const active = text(formData, "active") === "true";
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.from("product_categories").update({ is_active: active }).eq("id", id).is("archived_at", null);
  if (error) throw new Error("Unable to update category status.");
  revalidateCatalogue();
}

export async function setCategoryOrderAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  const order = Number(text(formData, "sort_order"));
  if (!isUuid(id) || !Number.isInteger(order) || order < -10000 || order > 10000) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.from("product_categories").update({ sort_order: order }).eq("id", id);
  if (error) throw new Error("Unable to reorder category.");
  revalidateCatalogue();
}

export async function archiveCategoryAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  if (!isUuid(id)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id).is("archived_at", null);
  if ((count || 0) > 0) throw new Error("Move or archive products in this category first.");
  const { error } = await supabase.from("product_categories").update({ is_active: false, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Unable to archive category.");
  revalidateCatalogue();
}

export async function uploadCategoryImageAction(id: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireManagement();
  if (!isUuid(id)) return { status: "error", message: "Invalid category identifier." };
  const file = formData.get("image");
  if (!(file instanceof File)) return { status: "error", message: "Choose an image." };
  const validationError = validateImageFile(file);
  if (validationError) return { status: "error", message: validationError };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data: category } = await supabase.from("product_categories").select("image_storage_path").eq("id", id).single();
  if (!category) return { status: "error", message: "Category not found." };
  const path = createMediaPath(id, file.type);
  const upload = await supabase.storage.from(CATEGORY_MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (upload.error) return { status: "error", message: `Image upload failed: ${upload.error.message}` };
  const altText = nullable(text(formData, "image_alt_text"));
  const { error } = await supabase.from("product_categories").update({ image_storage_path: path, image_alt_text: altText }).eq("id", id);
  if (error) {
    await supabase.storage.from(CATEGORY_MEDIA_BUCKET).remove([path]);
    return databaseError(error, "category image");
  }
  if (category.image_storage_path) await supabase.storage.from(CATEGORY_MEDIA_BUCKET).remove([category.image_storage_path]);
  revalidateCatalogue();
  return { status: "success", message: "Category image saved." };
}

export async function removeCategoryImageAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id");
  if (!isUuid(id)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data } = await supabase.from("product_categories").select("image_storage_path").eq("id", id).single();
  if (!data?.image_storage_path) return;
  const removal = await supabase.storage.from(CATEGORY_MEDIA_BUCKET).remove([data.image_storage_path]);
  if (removal.error) throw new Error("Unable to remove category image.");
  const { error } = await supabase.from("product_categories").update({ image_storage_path: null, image_alt_text: null }).eq("id", id);
  if (error) throw new Error("Unable to clear category image metadata.");
  revalidateCatalogue();
}
