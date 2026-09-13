"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveQuotationAction } from "@/app/dashboard/quotations/actions";
import { QUOTATION_UNITS } from "@/lib/quotations/constants";
import type { QuotationBuilderInitial } from "@/lib/quotations/defaults";
import { formatMoney, quotationPreviewTotals } from "@/lib/quotations/money";
import type {
  DiscountType,
  QuotationActionState,
  QuotationItemInput,
  QuotationMeasurementOption,
  QuotationProductOption,
} from "@/lib/quotations/types";

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  address: string | null;
  area: string | null;
  emirate: string | null;
};
type EnquiryOption = {
  id: string;
  enquiry_number: number;
  customer_id: string | null;
  subject: string | null;
  assigned_to: string | null;
};
type VisitOption = {
  id: string;
  visit_number: number;
  customer_id: string;
  enquiry_id: string | null;
  site_address: string;
  status: string;
  measurement_summary: string | null;
};
type StaffOption = { id: string; full_name: string; role: string };

type Props = {
  initial: QuotationBuilderInitial;
  role: "admin" | "sales";
  currentUserId: string;
  options: {
    customers: CustomerOption[];
    enquiries: EnquiryOption[];
    visits: VisitOption[];
    products: QuotationProductOption[];
    measurements: QuotationMeasurementOption[];
    staff: StaffOption[];
  };
};

const initialActionState: QuotationActionState = { ok: false, message: "" };
const input =
  "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";
const emptyItem = (sortOrder: number): QuotationItemInput => ({
  product_id: null,
  source_measurement_id: null,
  item_name: "",
  description: "",
  quantity: "1",
  unit: "item",
  width: "",
  height: "",
  length: "",
  dimensions_details: "",
  unit_price: "0",
  discount_amount: "0",
  taxable: true,
  sort_order: sortOrder,
});

export function QuotationBuilder({
  initial,
  role,
  currentUserId,
  options,
}: Props) {
  const [state, action, pending] = useActionState(
    saveQuotationAction,
    initialActionState,
  );
  const [draft, setDraft] = useState(initial);
  const enquiries = useMemo(
    () =>
      options.enquiries.filter(
        (item) => !draft.customer_id || item.customer_id === draft.customer_id,
      ),
    [options.enquiries, draft.customer_id],
  );
  const visits = useMemo(
    () =>
      options.visits.filter(
        (item) =>
          (!draft.customer_id || item.customer_id === draft.customer_id) &&
          (!draft.enquiry_id || item.enquiry_id === draft.enquiry_id),
      ),
    [options.visits, draft.customer_id, draft.enquiry_id],
  );
  const measurements = useMemo(
    () =>
      options.measurements.filter(
        (item) => item.site_visit_id === draft.site_visit_id,
      ),
    [options.measurements, draft.site_visit_id],
  );
  const totals = useMemo(
    () =>
      quotationPreviewTotals(
        draft.items,
        draft.discount_type,
        draft.discount_value,
        draft.vat_rate,
      ),
    [draft.items, draft.discount_type, draft.discount_value, draft.vat_rate],
  );

  function chooseCustomer(id: string) {
    const customer = options.customers.find((item) => item.id === id);
    setDraft((current) => ({
      ...current,
      customer_id: id,
      enquiry_id: "",
      site_visit_id: "",
      customer_name_snapshot: customer?.name || "",
      customer_company_snapshot: customer?.company_name || "",
      customer_phone_snapshot: customer?.phone || "",
      customer_email_snapshot: customer?.email || "",
      site_address_snapshot: [
        customer?.address,
        customer?.area,
        customer?.emirate,
      ]
        .filter(Boolean)
        .join(", "),
    }));
  }
  function chooseEnquiry(id: string) {
    const enquiry = options.enquiries.find((item) => item.id === id);
    setDraft((current) => ({
      ...current,
      enquiry_id: id,
      site_visit_id: "",
      owner_id:
        role === "sales"
          ? currentUserId
          : enquiry?.assigned_to || current.owner_id,
    }));
  }
  function chooseVisit(id: string) {
    const visit = options.visits.find((item) => item.id === id);
    setDraft((current) => ({
      ...current,
      site_visit_id: id,
      site_address_snapshot:
        visit?.site_address || current.site_address_snapshot,
      introduction: current.introduction || visit?.measurement_summary || "",
    }));
  }
  function updateItem(index: number, changes: Partial<QuotationItemInput>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }));
  }
  function chooseProduct(index: number, productId: string) {
    const product = options.products.find((item) => item.id === productId);
    updateItem(
      index,
      product
        ? {
            product_id: product.id,
            item_name: product.name,
            description:
              product.short_description || product.full_description || "",
            unit_price:
              product.price !== null &&
              ["fixed_price", "starting_price"].includes(product.pricing_mode)
                ? String(product.price)
                : draft.items[index].unit_price,
          }
        : { product_id: null },
    );
  }
  function addMeasurement(id: string) {
    const measurement = measurements.find((item) => item.id === id);
    if (!measurement) return;
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          ...emptyItem((current.items.length + 1) * 10),
          source_measurement_id: measurement.id,
          item_name: measurement.label,
          description:
            measurement.notes || `Measurement snapshot from site visit`,
          quantity: String(measurement.quantity),
          unit: measurement.unit,
          width: measurement.width === null ? "" : String(measurement.width),
          height: measurement.height === null ? "" : String(measurement.height),
          length: measurement.length === null ? "" : String(measurement.length),
        },
      ],
    }));
  }
  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return;
    setDraft((current) => {
      const items = [...current.items];
      [items[index], items[target]] = [items[target], items[index]];
      return {
        ...current,
        items: items.map((item, itemIndex) => ({
          ...item,
          sort_order: (itemIndex + 1) * 10,
        })),
      };
    });
  }

  return (
    <form action={action} className="space-y-6">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <input type="hidden" name="items" value={JSON.stringify(draft.items)} />
      {state.message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-md border px-4 py-3 text-sm ${state.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}
        >
          {state.message}
        </div>
      )}

      <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <h2 className="text-lg font-semibold">Quotation context</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Customer
            <select
              className={input}
              name="customer_id"
              value={draft.customer_id}
              onChange={(event) => chooseCustomer(event.target.value)}
              required
            >
              <option value="">Choose customer</option>
              {options.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.company_name ? ` · ${item.company_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Enquiry
            <select
              className={input}
              name="enquiry_id"
              value={draft.enquiry_id}
              onChange={(event) => chooseEnquiry(event.target.value)}
            >
              <option value="">No linked enquiry</option>
              {enquiries.map((item) => (
                <option key={item.id} value={item.id}>
                  ENQ-{String(item.enquiry_number).padStart(6, "0")} ·{" "}
                  {item.subject || "General enquiry"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Site visit
            <select
              className={input}
              name="site_visit_id"
              value={draft.site_visit_id}
              onChange={(event) => chooseVisit(event.target.value)}
            >
              <option value="">No linked site visit</option>
              {visits.map((item) => (
                <option key={item.id} value={item.id}>
                  SV-{String(item.visit_number).padStart(6, "0")} ·{" "}
                  {item.site_address}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Owner
            <select
              className={input}
              name="owner_id"
              value={role === "sales" ? currentUserId : draft.owner_id}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  owner_id: event.target.value,
                }))
              }
              disabled={role === "sales"}
            >
              {options.staff.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
            {role === "sales" && (
              <input type="hidden" name="owner_id" value={currentUserId} />
            )}
          </label>
        </div>
      </section>

      <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
        <h2 className="text-lg font-semibold">Commercial snapshot</h2>
        <p className="mt-1 text-sm text-stone">
          These values are preserved with this revision and do not follow later
          customer or product edits.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Issue date
            <input
              className={input}
              type="date"
              name="issue_date"
              value={draft.issue_date}
              onChange={(event) =>
                setDraft({ ...draft, issue_date: event.target.value })
              }
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Valid until
            <input
              className={input}
              type="date"
              name="validity_date"
              value={draft.validity_date}
              min={draft.issue_date}
              onChange={(event) =>
                setDraft({ ...draft, validity_date: event.target.value })
              }
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Currency
            <input
              className={input}
              name="currency"
              value={draft.currency}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  currency: event.target.value.toUpperCase().slice(0, 3),
                })
              }
              pattern="[A-Z]{3}"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Customer name
            <input
              className={input}
              name="customer_name_snapshot"
              value={draft.customer_name_snapshot}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  customer_name_snapshot: event.target.value,
                })
              }
              required
              maxLength={200}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Company
            <input
              className={input}
              name="customer_company_snapshot"
              value={draft.customer_company_snapshot}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  customer_company_snapshot: event.target.value,
                })
              }
              maxLength={200}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Phone
            <input
              className={input}
              name="customer_phone_snapshot"
              value={draft.customer_phone_snapshot}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  customer_phone_snapshot: event.target.value,
                })
              }
              maxLength={50}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className={input}
              type="email"
              name="customer_email_snapshot"
              value={draft.customer_email_snapshot}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  customer_email_snapshot: event.target.value,
                })
              }
              maxLength={320}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium xl:col-span-4">
            Site / project address
            <textarea
              className={`${input} min-h-20 py-3`}
              name="site_address_snapshot"
              value={draft.site_address_snapshot}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  site_address_snapshot: event.target.value,
                })
              }
              maxLength={2000}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium md:col-span-2 xl:col-span-4">
            Introduction / scope
            <textarea
              className={`${input} min-h-24 py-3`}
              name="introduction"
              value={draft.introduction}
              onChange={(event) =>
                setDraft({ ...draft, introduction: event.target.value })
              }
              maxLength={4000}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Quotation items</h2>
            <p className="mt-1 text-sm text-stone">
              Catalogue products and custom fabricated work can be mixed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  items: [
                    ...current.items,
                    emptyItem((current.items.length + 1) * 10),
                  ],
                }))
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
            >
              <Plus size={16} />
              Custom item
            </button>
            {measurements.length > 0 && (
              <label className="grid gap-1 text-xs font-medium">
                <span className="sr-only">Copy site measurement</span>
                <select
                  className={`${input} max-w-72`}
                  defaultValue=""
                  onChange={(event) => {
                    addMeasurement(event.target.value);
                    event.target.value = "";
                  }}
                >
                  <option value="">Copy a site measurement…</option>
                  {measurements.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {draft.items.map((item, index) => (
            <article
              key={`${index}-${item.sort_order}`}
              className="rounded-lg border border-line bg-paper p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Item {index + 1}</p>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="grid size-10 place-items-center disabled:opacity-30"
                    aria-label="Move item up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === draft.items.length - 1}
                    className="grid size-10 place-items-center disabled:opacity-30"
                    aria-label="Move item down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        items: current.items.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                    disabled={draft.items.length === 1}
                    className="grid size-10 place-items-center text-red-700 disabled:opacity-30"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label className="grid gap-1 text-xs font-medium xl:col-span-2">
                  Catalogue product
                  <select
                    className={input}
                    value={item.product_id || ""}
                    onChange={(event) =>
                      chooseProduct(index, event.target.value)
                    }
                  >
                    <option value="">Custom / manual item</option>
                    {options.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.product_code
                          ? ` · ${product.product_code}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium xl:col-span-2">
                  Item name
                  <input
                    className={input}
                    value={item.item_name}
                    onChange={(event) =>
                      updateItem(index, { item_name: event.target.value })
                    }
                    maxLength={200}
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Quantity
                  <input
                    className={input}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Unit
                  <select
                    className={input}
                    value={item.unit}
                    onChange={(event) =>
                      updateItem(index, { unit: event.target.value })
                    }
                  >
                    {QUOTATION_UNITS.map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium md:col-span-2 xl:col-span-6">
                  Description
                  <textarea
                    className={`${input} min-h-20 py-3`}
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                    maxLength={8000}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Width
                  <input
                    className={input}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.width}
                    onChange={(event) =>
                      updateItem(index, { width: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Height
                  <input
                    className={input}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.height}
                    onChange={(event) =>
                      updateItem(index, { height: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Length / depth
                  <input
                    className={input}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.length}
                    onChange={(event) =>
                      updateItem(index, { length: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Unit price
                  <input
                    className={input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(event) =>
                      updateItem(index, { unit_price: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Line discount
                  <input
                    className={input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount_amount}
                    onChange={(event) =>
                      updateItem(index, { discount_amount: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium">
                  <input
                    className="size-5 accent-brass-dark"
                    type="checkbox"
                    checked={item.taxable}
                    onChange={(event) =>
                      updateItem(index, { taxable: event.target.checked })
                    }
                  />
                  Taxable
                </label>
                <label className="grid gap-1 text-xs font-medium md:col-span-2 xl:col-span-5">
                  Dimension / fabrication notes
                  <input
                    className={input}
                    value={item.dimensions_details}
                    onChange={(event) =>
                      updateItem(index, {
                        dimensions_details: event.target.value,
                      })
                    }
                    maxLength={2000}
                  />
                </label>
                <div className="self-end text-right">
                  <p className="text-xs text-stone">Line total</p>
                  <p className="mt-1 font-semibold">
                    {formatMoney(totals.lines[index] || 0, draft.currency)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
          <h2 className="text-lg font-semibold">Notes and terms</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Customer-facing notes
              <textarea
                className={`${input} min-h-24 py-3`}
                name="customer_notes"
                value={draft.customer_notes}
                onChange={(event) =>
                  setDraft({ ...draft, customer_notes: event.target.value })
                }
                maxLength={8000}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Terms and conditions
              <textarea
                className={`${input} min-h-36 py-3`}
                name="terms"
                value={draft.terms}
                onChange={(event) =>
                  setDraft({ ...draft, terms: event.target.value })
                }
                maxLength={12000}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Internal notes
              <textarea
                className={`${input} min-h-24 py-3`}
                name="internal_notes"
                value={draft.internal_notes}
                onChange={(event) =>
                  setDraft({ ...draft, internal_notes: event.target.value })
                }
                maxLength={8000}
              />
            </label>
          </div>
        </section>
        <aside className="h-fit rounded-lg border border-line bg-graphite p-5 text-white xl:sticky xl:top-8">
          <h2 className="text-base font-semibold">Pricing summary</h2>
          <div className="mt-5 grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-white/70">
              Discount type
              <select
                className="min-h-11 rounded-md border border-white/20 bg-white px-3 text-base text-graphite"
                name="discount_type"
                value={draft.discount_type}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    discount_type: event.target.value as DiscountType,
                  })
                }
              >
                <option value="fixed">Fixed AED</option>
                <option value="percentage">Percentage</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-white/70">
              Discount value
              <input
                className="min-h-11 rounded-md border border-white/20 bg-white px-3 text-base text-graphite"
                name="discount_value"
                type="number"
                min="0"
                max={draft.discount_type === "percentage" ? 100 : undefined}
                step={draft.discount_type === "percentage" ? "0.01" : "0.01"}
                value={draft.discount_value}
                onChange={(event) =>
                  setDraft({ ...draft, discount_value: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-white/70">
              VAT rate %
              <input
                className="min-h-11 rounded-md border border-white/20 bg-white px-3 text-base text-graphite"
                name="vat_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={draft.vat_rate}
                onChange={(event) =>
                  setDraft({ ...draft, vat_rate: event.target.value })
                }
              />
            </label>
          </div>
          <dl className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">Subtotal</dt>
              <dd>{formatMoney(totals.subtotal, draft.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">Discount</dt>
              <dd>-{formatMoney(totals.discount, draft.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">VAT</dt>
              <dd>{formatMoney(totals.vat, draft.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/15 pt-4 text-lg font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(totals.total, draft.currency)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-white/50">
            Preview uses integer minor-unit rounding. Supabase recalculates
            every amount authoritatively when saved.
          </p>
        </aside>
      </div>
      <div className="sticky bottom-16 z-10 flex justify-end border-t border-line bg-limestone/95 py-3 backdrop-blur lg:bottom-0">
        <button
          disabled={pending}
          className="min-h-12 rounded-md bg-brass-dark px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending
            ? "Saving quotation…"
            : draft.id
              ? "Save quotation"
              : "Create quotation"}
        </button>
      </div>
    </form>
  );
}
