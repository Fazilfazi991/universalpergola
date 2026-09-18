import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import { getAssets } from "@/lib/operations/queries";
import { formatMoney } from "@/lib/quotations/money";
import { createAssetAction } from "@/app/dashboard/accounts/actions";

const input = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";
const categoryOptions = [
  "Cutting Machine", "Welding Machine", "Fabrication Machine", "Drilling Machine",
  "Grinding / Polishing Machine", "Coating / Painting Equipment", "Power Tool",
  "Hand Tool", "Installation Equipment", "Vehicle", "Workshop Equipment",
  "Office Equipment", "Safety Equipment", "Other",
];

export default async function AssetsPage() {
  await requireModuleAccess("accounts");
  const assets = await getAssets();

  return <div className="space-y-7">
    <Link href="/dashboard/accounts" className="text-sm text-stone hover:text-graphite">← Back to Accounts</Link>
    <PageHeading title="Assets & machinery" description="Active equipment, planned purchases, and private supporting documents." />
    <section className="rounded-lg border border-line bg-paper p-5">
      <h2 className="text-lg font-semibold">Add asset or planned purchase</h2>
      <form action={createAssetAction} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Asset name<input name="name" required className={input} placeholder="e.g. TIG welder" /></label>
        <label className="grid gap-2 text-sm font-medium">Asset code<input name="asset_code" required className={input} placeholder="e.g. AST-001" /></label>
        <label className="grid gap-2 text-sm font-medium">Category<select name="category" required className={input} defaultValue=""><option value="" disabled>Choose a category</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium">Status<select name="status" className={input} defaultValue="planned"><option value="planned">Planned purchase</option><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Brand<input name="brand" className={input} placeholder="Optional brand" /></label>
        <label className="grid gap-2 text-sm font-medium">Model<input name="model" className={input} placeholder="Optional model" /></label>
        <label className="grid gap-2 text-sm font-medium">Planned purchase date<input name="planned_purchase_date" type="date" className={input} /></label>
        <label className="grid gap-2 text-sm font-medium">Purchase date<input name="purchase_date" type="date" className={input} /></label>
        <label className="grid gap-2 text-sm font-medium">Estimated cost (AED)<input name="estimated_cost" type="number" min="0" step="0.01" className={input} placeholder="Optional estimate" /></label>
        <label className="grid gap-2 text-sm font-medium">Purchase cost (AED)<input name="purchase_cost" type="number" min="0" step="0.01" className={input} placeholder="Optional final cost" /></label>
        <label className="grid gap-2 text-sm font-medium">Supplier<input name="supplier" className={input} placeholder="Optional supplier" /></label>
        <label className="grid gap-2 text-sm font-medium">Location<input name="location" className={input} placeholder="e.g. Workshop" /></label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Notes<textarea name="notes" className={`${input} min-h-20 py-3`} placeholder="Private notes" /></label>
        <button className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white hover:bg-ink sm:col-span-2">Save asset</button>
      </form>
    </section>
    <section>
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Asset register</h2><p className="mt-1 text-sm text-stone">Private records are visible only to authorised finance staff.</p></div><span className="text-xs text-stone">{assets.length} records</span></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="rounded-lg border border-line bg-paper p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{asset.name}</p><p className="mt-1 text-xs text-stone">{asset.asset_code} · {asset.category}</p></div><span className="rounded-sm border border-line px-2 py-1 text-xs capitalize">{asset.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-stone">Supplier</dt><dd className="mt-1">{asset.supplier || "—"}</dd></div><div><dt className="text-xs text-stone">Value</dt><dd className="mt-1">{formatMoney(Number(asset.purchase_cost ?? asset.estimated_cost ?? 0), asset.currency)}</dd></div><div><dt className="text-xs text-stone">Location</dt><dd className="mt-1">{asset.location || "—"}</dd></div><div><dt className="text-xs text-stone">Planned purchase</dt><dd className="mt-1">{asset.planned_purchase_date || "—"}</dd></div><div><dt className="text-xs text-stone">Purchase date</dt><dd className="mt-1">{asset.purchase_date || "—"}</dd></div></dl>{asset.notes ? <p className="mt-4 border-t border-line pt-3 text-sm text-stone">{asset.notes}</p> : null}</article>)}{!assets.length ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-stone md:col-span-2 xl:col-span-3">No assets yet. Add active machinery or a planned purchase above.</p> : null}</div>
    </section>
  </div>;
}
