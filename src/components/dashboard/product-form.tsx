"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createProductAction, updateProductAction } from "@/app/dashboard/products/actions";
import type { AdminProduct } from "@/lib/catalogue/admin-queries";
import { PRICING_MODES, slugify } from "@/lib/catalogue/validation";
import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/forms/action-state";

type CategoryOption = { id: string; name: string; is_active: boolean };
type SpecificationRow = { id: string; key: string; value: string };
const inputClass = "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base text-graphite placeholder:text-stone/60";
const labelClass = "grid gap-2 text-sm font-medium text-graphite";

function FieldError({ errors }: { errors?: string[] }) { return errors?.[0] ? <span className="text-sm font-normal text-red-700">{errors[0]}</span> : null; }
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="border-t border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6"><h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-stone">{description}</p>}<div className="mt-5">{children}</div></section>;
}

export function ProductForm({ product, categories }: { product?: AdminProduct; categories: CategoryOption[] }) {
  const boundAction = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(async (previousState: ActionState, formData: FormData) => {
    const nextState = await boundAction(previousState, formData);
    if (nextState.status === "success") setDirty(false);
    return nextState;
  }, INITIAL_ACTION_STATE);
  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [pricingMode, setPricingMode] = useState(product?.pricing_mode || "price_on_request");
  const initialSpecs = useMemo(() => Object.entries(product?.specifications || {}).map(([key, value]) => ({ id: crypto.randomUUID(), key, value })), [product?.specifications]);
  const [specifications, setSpecifications] = useState<SpecificationRow[]>(initialSpecs);
  const specificationJson = JSON.stringify(Object.fromEntries(specifications.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()])));

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <form action={formAction} onChange={() => setDirty(true)} className="space-y-6">
      {state.message && <div role={state.status === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</div>}

      <Section title="Basic information">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>Product name<input className={inputClass} name="name" value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugEdited) setSlug(slugify(next)); }} required maxLength={160} /><FieldError errors={state.fieldErrors?.name} /></label>
          <label className={labelClass}>Slug<input className={inputClass} name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} required maxLength={96} spellCheck={false} /><FieldError errors={state.fieldErrors?.slug} /></label>
          <label className={labelClass}>SKU / product code<input className={inputClass} name="product_code" defaultValue={product?.product_code || ""} maxLength={80} /></label>
          <label className={labelClass}>Sort order<input className={inputClass} name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} min={-10000} max={10000} /></label>
        </div>
      </Section>

      <Section title="Category" description="Only products in active categories can be published.">
        <label className={labelClass}>Product category<select className={inputClass} name="category_id" defaultValue={product?.category_id || ""} required><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.is_active ? "" : " (inactive)"}</option>)}</select><FieldError errors={state.fieldErrors?.category_id} /></label>
      </Section>

      <Section title="Descriptions">
        <div className="grid gap-5">
          <label className={labelClass}>Short description<textarea className={`${inputClass} min-h-24 py-3`} name="short_description" defaultValue={product?.short_description || ""} maxLength={360} /></label>
          <label className={labelClass}>Full description<textarea className={`${inputClass} min-h-48 py-3`} name="full_description" defaultValue={product?.full_description || ""} maxLength={12000} /></label>
        </div>
      </Section>

      <Section title="Specifications" description="Add readable label and value pairs; staff never edit raw JSON.">
        <input type="hidden" name="specifications" value={specificationJson} />
        <div className="space-y-3">{specifications.map((row) => <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_auto]"><input aria-label="Specification label" className={inputClass} value={row.key} maxLength={80} placeholder="Label, e.g. Wind rating" onChange={(event) => setSpecifications((items) => items.map((item) => item.id === row.id ? { ...item, key: event.target.value } : item))} /><input aria-label="Specification value" className={inputClass} value={row.value} maxLength={300} placeholder="Value" onChange={(event) => setSpecifications((items) => items.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))} /><button type="button" className="min-h-12 rounded-md border border-line px-4 text-sm text-stone" onClick={() => setSpecifications((items) => items.filter((item) => item.id !== row.id))}>Remove</button></div>)}</div>
        <button type="button" className="mt-4 min-h-11 rounded-md border border-line bg-limestone px-4 text-sm font-medium" onClick={() => setSpecifications((items) => [...items, { id: crypto.randomUUID(), key: "", value: "" }])}>Add specification</button>
        <FieldError errors={state.fieldErrors?.specifications} />
        <div className="mt-6 grid gap-5 sm:grid-cols-3"><label className={labelClass}>Material<textarea className={`${inputClass} min-h-28 py-3`} name="material" defaultValue={product?.material || ""} maxLength={500} /></label><label className={labelClass}>Colours<textarea className={`${inputClass} min-h-28 py-3`} name="colour_information" defaultValue={product?.colour_information || ""} maxLength={1000} /></label><label className={labelClass}>Dimensions<textarea className={`${inputClass} min-h-28 py-3`} name="dimensions_information" defaultValue={product?.dimensions_information || ""} maxLength={1000} /></label></div>
      </Section>

      <Section title="Pricing" description="AED is fixed for this phase. Hidden pricing displays no placeholder publicly.">
        <div className="grid gap-5 sm:grid-cols-2"><label className={labelClass}>Pricing mode<select className={inputClass} name="pricing_mode" value={pricingMode} onChange={(event) => setPricingMode(event.target.value as typeof pricingMode)}>{PRICING_MODES.map((mode) => <option key={mode} value={mode}>{({ hidden: "Hidden", price_on_request: "Price on request", starting_price: "Starting price", fixed_price: "Fixed price" } as Record<string, string>)[mode]}</option>)}</select></label><label className={labelClass}>Price (AED)<input className={inputClass} name="price" type="number" step="0.01" min="0" defaultValue={product?.price ?? ""} disabled={["hidden", "price_on_request"].includes(pricingMode)} required={["starting_price", "fixed_price"].includes(pricingMode)} /><FieldError errors={state.fieldErrors?.price} /></label></div>
      </Section>

      <Section title="Media" description={product ? "Images are managed below after saving product details." : "Create the product first, then add its cover and gallery images."}><p className="text-sm text-stone">JPEG, PNG, or WebP. Maximum 10 MB per image.</p></Section>

      <Section title="Publishing">
        <div className="grid gap-3 sm:grid-cols-2"><label className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-limestone px-4 text-sm font-medium"><input name="is_published" type="checkbox" defaultChecked={product?.is_published ?? false} className="size-5 accent-brass-dark" />Published in catalogue</label><label className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-limestone px-4 text-sm font-medium"><input name="is_featured" type="checkbox" defaultChecked={product?.is_featured ?? false} className="size-5 accent-brass-dark" />Featured product</label></div>
      </Section>

      <Section title="Search appearance"><div className="grid gap-5"><label className={labelClass}>SEO title<input className={inputClass} name="seo_title" defaultValue={product?.seo_title || ""} maxLength={70} /></label><label className={labelClass}>SEO description<textarea className={`${inputClass} min-h-24 py-3`} name="seo_description" defaultValue={product?.seo_description || ""} maxLength={180} /></label></div></Section>

      <div className="sticky bottom-16 z-10 flex items-center justify-between gap-4 border border-line bg-paper/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-4 sm:rounded-lg"><p className="text-xs text-stone">{dirty ? "Unsaved changes" : product ? "All changes saved" : "Images can be added after creation"}</p><button disabled={pending || categories.length === 0} className="min-h-12 rounded-md bg-graphite px-6 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : product ? "Save changes" : "Create product"}</button></div>
    </form>
  );
}
