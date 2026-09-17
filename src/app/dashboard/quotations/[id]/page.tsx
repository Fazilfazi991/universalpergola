import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  FilePenLine,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  createQuotationRevisionAction,
  transitionQuotationAction,
  convertQuotationToProjectAction,
} from "@/app/dashboard/quotations/actions";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { formatMoney } from "@/lib/quotations/money";
import {
  quotationActivityLabel,
  quotationStatusClass,
  quotationStatusLabel,
} from "@/lib/quotations/presentation";
import { getQuotation, getQuotationWorkspace } from "@/lib/quotations/queries";

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-stone">{label}</dt>
      <dd className="mt-1 text-sm leading-6">{children || "—"}</dd>
    </div>
  );
}
function StatusAction({
  id,
  status,
  label,
  icon: Icon,
  noteRequired = false,
}: {
  id: string;
  status: string;
  label: string;
  icon?: typeof Check;
  noteRequired?: boolean;
}) {
  return (
    <form
      action={transitionQuotationAction}
      className={noteRequired ? "flex flex-wrap items-end gap-2" : undefined}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {noteRequired && (
        <label className="grid gap-1 text-xs font-medium">
          Decision note
          <input
            className="min-h-11 rounded-md border border-line px-3 text-base"
            name="note"
            required
            maxLength={2000}
          />
        </label>
      )}
      <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white">
        {Icon && <Icon size={16} />}
        {label}
      </button>
    </form>
  );
}

export default async function QuotationPage({
  params,
  searchParams,
}: PageProps<"/dashboard/quotations/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const [profile, quote] = await Promise.all([
    requireModuleAccess("quotations"),
    getQuotation(id),
  ]);
  if (!quote) notFound();
  const workspace = await getQuotationWorkspace(quote);
  const canCommercial = profile.role === "admin" || profile.role === "sales";
  const canEdit = canCommercial && ["draft", "ready"].includes(quote.status);
  const isExpired =
    quote.status === "sent" &&
    Boolean(
      quote.validity_date &&
      quote.validity_date < new Date().toISOString().slice(0, 10),
    );
  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/quotations"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"
      >
        <ArrowLeft size={16} />
        Back to quotations
      </Link>
      <PageHeading
        title={quote.quotation_number}
        description={`${quote.customer_name_snapshot} · Revision ${quote.revision_number}${quote.is_current ? " · Current" : ""}`}
        action={
          <a
            href={`/dashboard/quotations/${id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
          >
            <Download size={16} />
            Download PDF
          </a>
        }
      />
      {quote.client_reference ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-sm"><span className="text-stone">Shared client / job reference</span><strong className="text-brass-dark">{quote.client_reference}</strong></div> : null}
      {query.saved === "1" && (
        <StatusNotice tone="success" title="Quotation saved">
          <p>Database-authoritative totals and snapshots are up to date.</p>
        </StatusNotice>
      )}
      {typeof query.error === "string" && (
        <StatusNotice tone="error" title="Action could not be completed">
          <p>
            {query.error === "revision-required"
              ? "Issued commercial terms are immutable. Create a revision to make changes."
              : query.error}
          </p>
        </StatusNotice>
      )}
      {typeof query.project === "string" && (
        <StatusNotice tone="success" title="Project handoff created">
          <p>
            The approved commercial snapshot has been converted exactly once.
          </p>
        </StatusNotice>
      )}
      {isExpired && (
        <StatusNotice title="Validity period ended">
          <p>
            This sent quotation is displayed as expired and cannot be approved.
            Management can persist the Expired status.
          </p>
        </StatusNotice>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-sm border px-3 py-2 text-sm ${quotationStatusClass(quote.status, quote.validity_date)}`}
        >
          {quotationStatusLabel(quote.status, quote.validity_date)}
        </span>
        {canEdit && (
          <Link
            href={`/dashboard/quotations/${id}/edit`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
          >
            <FilePenLine size={16} />
            Edit
          </Link>
        )}
        {canCommercial && quote.status === "draft" && (
          <StatusAction
            id={id}
            status="ready"
            label="Mark ready"
            icon={Check}
          />
        )}
        {canCommercial && quote.status === "ready" && (
          <>
            <StatusAction id={id} status="draft" label="Return to draft" />
            <StatusAction id={id} status="sent" label="Mark sent" icon={Send} />
          </>
        )}
        {canCommercial && quote.status === "sent" && (
          <form action={createQuotationRevisionAction}>
            <input type="hidden" name="id" value={id} />
            <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium">
              <RotateCcw size={16} />
              Create revision
            </button>
          </form>
        )}
        {canCommercial && quote.status === "sent" && isExpired && (
          <StatusAction id={id} status="expired" label="Mark expired" />
        )}
        {canCommercial && ["draft", "ready"].includes(quote.status) && (
          <StatusAction id={id} status="cancelled" label="Cancel" icon={X} />
        )}
      </div>
      {profile.role === "admin" && quote.status === "sent" && !isExpired && (
        <section className="flex flex-wrap gap-4 rounded-lg border border-line bg-limestone p-4">
          <StatusAction
            id={id}
            status="approved"
            label="Approve"
            icon={Check}
            noteRequired
          />
          <StatusAction
            id={id}
            status="rejected"
            label="Reject"
            icon={X}
            noteRequired
          />
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.7fr)]">
        <div className="space-y-6">
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Quotation summary</h2>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Customer">
                <Link
                  href={`/dashboard/customers/${quote.customer_id}`}
                  className="font-medium text-brass-dark"
                >
                  {quote.customer_name_snapshot}
                </Link>
              </Detail>
              <Detail label="Company">{quote.customer_company_snapshot}</Detail>
              <Detail label="Phone / email">
                {[quote.customer_phone_snapshot, quote.customer_email_snapshot]
                  .filter(Boolean)
                  .join(" · ")}
              </Detail>
              <Detail label="Owner">
                {quote.owner?.full_name || "Unassigned"}
              </Detail>
              <Detail label="Issue date">{formatDate(quote.issue_date)}</Detail>
              <Detail label="Valid until">
                {formatDate(quote.validity_date)}
              </Detail>
              <Detail label="Linked enquiry">
                {quote.enquiry ? (
                  <Link
                    href={`/dashboard/enquiries/${quote.enquiry.id}`}
                    className="font-medium text-brass-dark"
                  >
                    ENQ-{String(quote.enquiry.enquiry_number).padStart(6, "0")}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Linked site visit">
                {quote.site_visit ? (
                  <Link
                    href={`/dashboard/site-visits/${quote.site_visit.id}`}
                    className="font-medium text-brass-dark"
                  >
                    SV-{String(quote.site_visit.visit_number).padStart(6, "0")}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Site / project address">
                {quote.site_address_snapshot}
              </Detail>
              <Detail label="Last update">
                {formatDate(quote.updated_at, true)}
              </Detail>
            </dl>
            {quote.introduction && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-xs text-stone">Scope / introduction</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {quote.introduction}
                </p>
              </div>
            )}
          </section>
          <section>
            <h2 className="text-lg font-semibold">Line items</h2>
            <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line bg-paper lg:block">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-line bg-limestone text-xs text-stone">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Dimensions</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Unit price
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Discount
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {workspace.items.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-md px-4 py-4">
                        <p className="font-medium">{item.item_name}</p>
                        {item.product_code_snapshot && (
                          <p className="text-xs text-stone">
                            {item.product_code_snapshot}
                          </p>
                        )}
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs text-stone">
                        {[
                          item.width && `W ${item.width}`,
                          item.height && `H ${item.height}`,
                          item.length && `L ${item.length}`,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          item.dimensions_details ||
                          "—"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {formatMoney(item.unit_price, quote.currency)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {formatMoney(item.discount_amount, quote.currency)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(item.line_total, quote.currency)}
                        {!item.taxable && (
                          <p className="text-[10px] font-normal text-stone">
                            Non-taxable
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3 lg:hidden">
              {workspace.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-line bg-paper p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.item_name}</p>
                      <p className="mt-1 text-xs text-stone">
                        {item.quantity} {item.unit} ·{" "}
                        {item.taxable ? "Taxable" : "Non-taxable"}
                      </p>
                    </div>
                    <strong className="shrink-0 text-sm">
                      {formatMoney(item.line_total, quote.currency)}
                    </strong>
                  </div>
                  {item.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone">
                    <p>Unit {formatMoney(item.unit_price, quote.currency)}</p>
                    <p className="text-right">
                      Discount{" "}
                      {formatMoney(item.discount_amount, quote.currency)}
                    </p>
                    <p className="col-span-2">
                      {[
                        item.width && `W ${item.width}`,
                        item.height && `H ${item.height}`,
                        item.length && `L ${item.length}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        item.dimensions_details ||
                        "No dimensions"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {(quote.customer_notes || quote.terms) && (
            <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
              <h2 className="text-lg font-semibold">Notes and terms</h2>
              {quote.customer_notes && (
                <div className="mt-5">
                  <p className="text-xs text-stone">Customer-facing notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {quote.customer_notes}
                  </p>
                </div>
              )}
              {quote.terms && (
                <div className="mt-5 border-t border-line pt-5">
                  <p className="text-xs text-stone">Terms and conditions</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {quote.terms}
                  </p>
                </div>
              )}
              {quote.internal_notes && profile.role !== "accounts" && (
                <div className="mt-5 border-t border-dashed border-line pt-5">
                  <p className="text-xs text-stone">Internal notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {quote.internal_notes}
                  </p>
                </div>
              )}
            </section>
          )}
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Activity timeline</h2>
            <ol className="mt-5 border-l border-line pl-6">
              {workspace.timeline.length ? (
                workspace.timeline.map((item) => (
                  <li key={item.id} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[1.72rem] top-1 size-2 rounded-full bg-brass" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {quotationActivityLabel(item.event_type, item.metadata)}
                      </p>
                      <time className="text-xs text-stone">
                        {formatDate(item.created_at, true)}
                      </time>
                    </div>
                    {typeof item.metadata.item_name === "string" && (
                      <p className="mt-1 text-sm text-stone">
                        {item.metadata.item_name}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone">
                      {item.actor?.full_name || "System"}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-stone">No activity yet.</li>
              )}
            </ol>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-graphite p-5 text-white">
            <h2 className="text-base font-semibold">Pricing</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">Subtotal</dt>
                <dd>{formatMoney(quote.subtotal, quote.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">
                  Discount{" "}
                  {quote.discount_type === "percentage"
                    ? `(${quote.discount_value}%)`
                    : ""}
                </dt>
                <dd>-{formatMoney(quote.discount_amount, quote.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">VAT ({quote.vat_rate}%)</dt>
                <dd>{formatMoney(quote.vat_amount, quote.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/15 pt-4 text-lg font-semibold">
                <dt>Grand total</dt>
                <dd>{formatMoney(quote.total, quote.currency)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Revision history</h2>
            <div className="mt-4 divide-y divide-line">
              {workspace.revisions.map((revision) => (
                <Link
                  key={revision.id}
                  href={`/dashboard/quotations/${revision.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Revision {revision.revision_number}
                    </p>
                    <p className="text-xs text-stone">
                      {formatDate(revision.issue_date)}
                    </p>
                  </div>
                  <span
                    className={`rounded-sm border px-2 py-1 text-xs ${quotationStatusClass(revision.status, revision.validity_date)}`}
                  >
                    {quotationStatusLabel(
                      revision.status,
                      revision.validity_date,
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Approval</h2>
            <p className="mt-3 text-sm text-stone">
              {quote.approved_at
                ? `Approved by ${quote.approver?.full_name || "Management"} on ${formatDate(quote.approved_at, true)}`
                : quote.rejected_at
                  ? `Rejected by ${quote.rejector?.full_name || "Management"} on ${formatDate(quote.rejected_at, true)}`
                  : "No final decision recorded."}
            </p>
            {quote.decision_note && (
              <p className="mt-3 border-t border-line pt-3 text-sm">
                {quote.decision_note}
              </p>
            )}
          </section>
          <section className="rounded-lg border border-line bg-limestone p-5">
            <h2 className="text-base font-semibold">Project handoff</h2>
            {workspace.project ? (
              <div className="mt-3">
                <Link href={`/dashboard/projects/${workspace.project.id}`} className="font-semibold text-brass-dark">{workspace.project.project_number}</Link>
                <p className="mt-1 text-sm text-stone">
                  Operational workspace · {workspace.project.status}
                </p>
              </div>
            ) : quote.status === "approved" &&
              quote.is_current &&
              profile.role === "admin" ? (
              <form action={convertQuotationToProjectAction} className="mt-4">
                <input type="hidden" name="id" value={id} />
                <button className="min-h-11 rounded-md bg-brass-dark px-4 text-sm font-semibold text-white">
                  Convert to project
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-stone">
                Available to Management after the current revision is approved.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
