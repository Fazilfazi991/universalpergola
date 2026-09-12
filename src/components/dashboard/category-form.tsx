"use client";

import { useActionState, useEffect, useState } from "react";
import { createCategoryAction, updateCategoryAction } from "@/app/dashboard/categories/actions";
import type { AdminCategory } from "@/lib/catalogue/admin-queries";
import { slugify } from "@/lib/catalogue/validation";
import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/forms/action-state";

const inputClass = "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base text-graphite placeholder:text-stone/60";
const labelClass = "grid gap-2 text-sm font-medium text-graphite";

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <span className="text-sm font-normal text-red-700">{errors[0]}</span> : null;
}

export function CategoryForm({ category }: { category?: AdminCategory }) {
  const boundAction = category ? updateCategoryAction.bind(null, category.id) : createCategoryAction;
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(async (previousState: ActionState, formData: FormData) => {
    const nextState = await boundAction(previousState, formData);
    if (nextState.status === "success") setDirty(false);
    return nextState;
  }, INITIAL_ACTION_STATE);
  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [slugEdited, setSlugEdited] = useState(Boolean(category));

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form action={formAction} onChange={() => setDirty(true)} className="space-y-6">
      {state.message && <div role={state.status === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</div>}

      <section className="border-t border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">Basic information</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>Category name<input className={inputClass} name="name" value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugEdited) setSlug(slugify(next)); }} required maxLength={120} /><ErrorText errors={state.fieldErrors?.name} /></label>
          <label className={labelClass}>Slug<input className={inputClass} name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} required maxLength={96} spellCheck={false} /><span className="text-xs font-normal text-stone">Used in the public category URL.</span><ErrorText errors={state.fieldErrors?.slug} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Short description<textarea className={`${inputClass} min-h-24 py-3`} name="description" defaultValue={category?.description || ""} maxLength={320} /><ErrorText errors={state.fieldErrors?.description} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Long description<textarea className={`${inputClass} min-h-40 py-3`} name="long_description" defaultValue={category?.long_description || ""} maxLength={6000} /><ErrorText errors={state.fieldErrors?.long_description} /></label>
        </div>
      </section>

      <section className="border-t border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">Visibility and order</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} min={-10000} max={10000} /></label>
          <label className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-limestone px-4 text-sm font-medium"><input name="is_active" type="checkbox" defaultChecked={category?.is_active ?? true} className="size-5 accent-brass-dark" />Active in the public catalogue</label>
        </div>
      </section>

      <section className="border-t border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">Search appearance</h2>
        <div className="mt-5 grid gap-5">
          <label className={labelClass}>SEO title<input className={inputClass} name="seo_title" defaultValue={category?.seo_title || ""} maxLength={70} /><ErrorText errors={state.fieldErrors?.seo_title} /></label>
          <label className={labelClass}>SEO description<textarea className={`${inputClass} min-h-24 py-3`} name="seo_description" defaultValue={category?.seo_description || ""} maxLength={180} /><ErrorText errors={state.fieldErrors?.seo_description} /></label>
        </div>
      </section>

      <div className="sticky bottom-16 z-10 flex items-center justify-between gap-4 border border-line bg-paper/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-4 sm:rounded-lg">
        <p className="text-xs text-stone">{dirty ? "Unsaved changes" : category ? "All changes saved" : "Create the category before adding an image"}</p>
        <button disabled={pending} className="min-h-12 rounded-md bg-graphite px-6 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : category ? "Save changes" : "Create category"}</button>
      </div>
    </form>
  );
}
