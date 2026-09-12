"use client";

import Image from "next/image";
import { useActionState } from "react";
import { removeCategoryImageAction, uploadCategoryImageAction } from "@/app/dashboard/categories/actions";
import { INITIAL_ACTION_STATE } from "@/lib/forms/action-state";

export function CategoryMedia({ category }: { category: { id: string; name: string; image_url: string | null; image_alt_text: string | null } }) {
  const [state, action, pending] = useActionState(uploadCategoryImageAction.bind(null, category.id), INITIAL_ACTION_STATE);
  return <section className="rounded-lg border border-line bg-paper p-5 sm:p-6"><h2 className="text-lg font-semibold tracking-[-0.025em]">Category image</h2><p className="mt-1 text-sm text-stone">Shown on category-led catalogue pages. JPEG, PNG, or WebP up to 10 MB.</p>
    {category.image_url && <div className="relative mt-5 aspect-[16/7] overflow-hidden rounded-md bg-limestone"><Image src={category.image_url} alt={category.image_alt_text || category.name} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" /></div>}
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="grid gap-2 text-sm font-medium">Image<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required className="min-h-12 rounded-md border border-line bg-limestone px-3 py-2 text-sm" /></label><label className="grid gap-2 text-sm font-medium">Alt text<input name="image_alt_text" defaultValue={category.image_alt_text || ""} maxLength={180} className="min-h-12 rounded-md border border-line bg-paper px-3 text-base" /></label><button disabled={pending} className="min-h-12 rounded-md bg-graphite px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Uploading…" : category.image_url ? "Replace image" : "Upload image"}</button></form>
    {state.message && <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
    {category.image_url && <form action={removeCategoryImageAction} className="mt-4"><input type="hidden" name="id" value={category.id} /><button className="min-h-11 text-sm font-medium text-red-700">Remove category image</button></form>}
  </section>;
}
