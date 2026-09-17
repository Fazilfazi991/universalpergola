"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveInvoiceDraftAction } from "@/app/dashboard/invoices/actions";
import { formatMoney } from "@/lib/quotations/money";
import type { InvoiceDetail, InvoiceItem } from "@/lib/invoices/queries";
import { INITIAL_INVOICE_ACTION_STATE, type InvoiceLineInput } from "@/lib/invoices/types";

const input = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";

function blankLine(sortOrder: number): InvoiceLineInput {
  return { item_name: "", description: "", quantity: 1, unit: "item", unit_price: 0, discount_amount: 0, taxable: true, sort_order: sortOrder };
}

export function InvoiceBuilder({ invoice, items }: { invoice: InvoiceDetail; items: InvoiceItem[] }) {
  const save = saveInvoiceDraftAction.bind(null, invoice.id);
  const [state, action, pending] = useActionState(save, INITIAL_INVOICE_ACTION_STATE);
  const [issueDate, setIssueDate] = useState(invoice.issue_date);
  const [dueDate, setDueDate] = useState(invoice.due_date || "");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(invoice.discount_type);
  const [discountValue, setDiscountValue] = useState(invoice.discount_value);
  const [vatRate, setVatRate] = useState(invoice.vat_rate);
  const [notes, setNotes] = useState(invoice.notes || "");
  const [terms, setTerms] = useState(invoice.terms || "");
  const [lines, setLines] = useState<InvoiceLineInput[]>(items.map((item) => ({
    item_name: item.item_name,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    taxable: item.taxable,
    sort_order: item.sort_order,
  })));

  const totals = useMemo(() => {
    const rows = lines.map((line) => ({
      amount: Math.max(0, Number(line.quantity) * Number(line.unit_price) - Number(line.discount_amount)),
      taxable: line.taxable,
    }));
    const subtotal = rows.reduce((sum, row) => sum + row.amount, 0);
    const taxableSubtotal = rows.filter((row) => row.taxable).reduce((sum, row) => sum + row.amount, 0);
    const discount = Math.min(subtotal, discountType === "percentage" ? subtotal * Number(discountValue) / 100 : Number(discountValue));
    const taxableDiscount = subtotal > 0 ? discount * taxableSubtotal / subtotal : 0;
    const vat = Math.max(0, taxableSubtotal - taxableDiscount) * Number(vatRate) / 100;
    return { subtotal, discount, vat, total: subtotal - discount + vat };
  }, [lines, discountType, discountValue, vatRate]);

  function updateLine(index: number, changes: Partial<InvoiceLineInput>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line));
  }

  function moveLine(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= lines.length) return;
    setLines((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((line, lineIndex) => ({ ...line, sort_order: (lineIndex + 1) * 10 }));
    });
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      {state.message ? <div role="status" className={`rounded-md border px-4 py-3 text-sm ${state.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>{state.message}</div> : null}

      <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Invoice dates and tax</h2><p className="mt-1 text-sm text-stone">Draft values remain editable until issue.</p></div>
          <p className="text-sm font-semibold text-brass-dark">{invoice.client_reference}</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm font-medium">Issue date<input className={input} name="issue_date" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required /></label>
          <label className="grid gap-2 text-sm font-medium">Due date<input className={input} name="due_date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Discount type<select className={input} name="discount_type" value={discountType} onChange={(event) => setDiscountType(event.target.value as "fixed" | "percentage")}><option value="fixed">Fixed amount</option><option value="percentage">Percentage</option></select></label>
          <label className="grid gap-2 text-sm font-medium">Discount<input className={input} name="discount_value" type="number" min="0" max={discountType === "percentage" ? "100" : undefined} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value))} /></label>
          <label className="grid gap-2 text-sm font-medium">VAT %<input className={input} name="vat_rate" type="number" min="0" max="100" step="0.01" value={vatRate} onChange={(event) => setVatRate(Number(event.target.value))} /></label>
        </div>
      </section>

      <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Invoice items</h2><p className="mt-1 text-sm text-stone">Copied from the approved quotation and safe to adjust while Draft.</p></div><button type="button" onClick={() => setLines((current) => [...current, blankLine((current.length + 1) * 10)])} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold"><Plus size={15} />Add item</button></div>
        <div className="mt-5 space-y-4">
          {lines.map((line, index) => <fieldset key={`${line.sort_order}-${index}`} className="rounded-lg border border-line bg-limestone/40 p-4">
            <legend className="px-2 text-xs font-semibold text-stone">Line {index + 1}</legend>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
              <label className="grid gap-2 text-sm font-medium xl:col-span-4">Description<input className={input} value={line.item_name} onChange={(event) => updateLine(index, { item_name: event.target.value })} required /></label>
              <label className="grid gap-2 text-sm font-medium xl:col-span-2">Quantity<input className={input} type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} required /></label>
              <label className="grid gap-2 text-sm font-medium xl:col-span-2">Unit<input className={input} value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} required /></label>
              <label className="grid gap-2 text-sm font-medium xl:col-span-2">Unit price<input className={input} type="number" min="0" step="0.01" value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: Number(event.target.value) })} required /></label>
              <label className="grid gap-2 text-sm font-medium xl:col-span-2">Line discount<input className={input} type="number" min="0" step="0.01" value={line.discount_amount} onChange={(event) => updateLine(index, { discount_amount: Number(event.target.value) })} /></label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2 xl:col-span-10">Details<textarea className="min-h-24 rounded-md border border-line bg-paper px-3 py-2 text-base" value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} /></label>
              <div className="flex items-end justify-between gap-2 md:col-span-2 xl:col-span-2"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={line.taxable} onChange={(event) => updateLine(index, { taxable: event.target.checked })} />Taxable</label><div className="flex"><button type="button" aria-label="Move line up" onClick={() => moveLine(index, -1)} className="grid size-10 place-items-center"><ArrowUp size={15} /></button><button type="button" aria-label="Move line down" onClick={() => moveLine(index, 1)} className="grid size-10 place-items-center"><ArrowDown size={15} /></button><button type="button" aria-label="Remove line" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1} className="grid size-10 place-items-center text-red-700 disabled:opacity-30"><Trash2 size={15} /></button></div></div>
            </div>
          </fieldset>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6"><h2 className="text-lg font-semibold">Notes and terms</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Notes<textarea className="min-h-36 rounded-md border border-line bg-paper px-3 py-2 text-base" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Terms<textarea className="min-h-36 rounded-md border border-line bg-paper px-3 py-2 text-base" name="terms" value={terms} onChange={(event) => setTerms(event.target.value)} /></label></div></section>
        <aside className="rounded-lg bg-graphite p-5 text-white"><h2 className="text-base font-semibold">Draft total</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4 text-white/65"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotal, invoice.currency)}</dd></div><div className="flex justify-between gap-4 text-white/65"><dt>Discount</dt><dd>-{formatMoney(totals.discount, invoice.currency)}</dd></div><div className="flex justify-between gap-4 text-white/65"><dt>VAT</dt><dd>{formatMoney(totals.vat, invoice.currency)}</dd></div><div className="flex justify-between gap-4 border-t border-white/15 pt-4 text-lg font-semibold"><dt>Total</dt><dd>{formatMoney(totals.total, invoice.currency)}</dd></div></dl><button disabled={pending || !lines.length} className="mt-6 min-h-11 w-full rounded-md bg-brass px-4 text-sm font-semibold text-ink disabled:opacity-50">{pending ? "Saving…" : "Save draft"}</button></aside>
      </div>
    </form>
  );
}
