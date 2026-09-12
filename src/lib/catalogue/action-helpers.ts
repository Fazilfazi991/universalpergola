import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/forms/action-state";

export function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function nullable(value: string) {
  const clean = value.trim();
  return clean || null;
}

export function databaseError(error: { code?: string; message: string }, noun: string): ActionState {
  if (error.code === "23505") {
    return { status: "error", message: `That ${noun} slug or code is already in use.` };
  }
  console.error(`Unable to save ${noun}:`, error.message);
  return { status: "error", message: `The ${noun} could not be saved. Check the fields and try again.` };
}

export function revalidateCatalogue(slug?: string, categorySlug?: string) {
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
  if (categorySlug) revalidatePath(`/categories/${categorySlug}`);
}
