import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { DemoDisabledNotice } from "@/components/dashboard/demo-disabled-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { isDemoMode } from "@/lib/demo-mode-server";
import { formatDate } from "@/lib/crm/presentation";
import {
  QUOTATION_STATUSES,
  QUOTATION_STATUS_LABELS,
} from "@/lib/quotations/constants";
import { formatMoney } from "@/lib/quotations/money";
import {
  quotationStatusClass,
  quotationStatusLabel,
} from "@/lib/quotations/presentation";
import {
  getQuotationFilterOptions,
  getQuotations,
  quotationFilters,
} from "@/lib/quotations/queries";

export default async function QuotationsPage({
  searchParams,
}: PageProps<"/dashboard/quotations">) {
  const [profile, params] = await Promise.all([
    requireModuleAccess("quotations"),
    searchParams,
  ]);
  const filters = quotationFilters(params);
  const [quotations, options] = await Promise.all([
    getQuotations(filters),
    getQuotationFilterOptions(),
  ]);
  const canCreate = (profile.role === "admin" || profile.role === "sales") && !isDemoMode();
  return (
    <div className="space-y-7">
      <PageHeading
        title="Quotations"
        description="Commercial drafts, issued revisions, approvals, and project handoff."
        action={
          canCreate ? (
            <Link
              href="/dashboard/quotations/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white"
            >
              <Plus size={17} />
              New quotation
            </Link>
          ) : undefined
        }
      />
      {isDemoMode() && <DemoDisabledNotice>Creating, revising, approving, rejecting, and converting quotations are disabled in the public demo.</DemoDisabledNotice>}
      <form className="grid gap-3 border-y border-line bg-paper py-4 sm:rounded-lg sm:border sm:p-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          className="min-h-11 rounded-md border border-line px-3 text-base xl:col-span-2"
          name="search"
          defaultValue={filters.search}
          placeholder="Number, customer, phone, or site"
          aria-label="Search quotations"
        />
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="status"
          defaultValue={filters.status}
          aria-label="Quotation status"
        >
          <option value="">Any status</option>
          {QUOTATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {QUOTATION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="owner"
          defaultValue={filters.owner}
          aria-label="Quotation owner"
        >
          <option value="">Any owner</option>
          {options.staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.full_name}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="customer"
          defaultValue={filters.customer}
          aria-label="Customer"
        >
          <option value="">Any customer</option>
          {options.customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <input
          className="min-h-11 rounded-md border border-line px-3 text-base"
          name="date"
          type="date"
          defaultValue={filters.date}
          aria-label="Issue date"
        />
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="approval"
          defaultValue={filters.approval}
          aria-label="Approval state"
        >
          <option value="">Any approval state</option>
          <option value="awaiting">Awaiting approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select
            className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
            name="expired"
            defaultValue={filters.expired}
            aria-label="Expired quotations"
          >
            <option value="">All validity</option>
            <option value="yes">Expired sent quotations</option>
          </select>
          <button className="min-h-11 rounded-md border border-line bg-limestone px-4 text-sm font-medium">
            Apply
          </button>
        </div>
      </form>
      {quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations found"
          description={
            canCreate
              ? "Create the first structured quotation or adjust the filters."
              : "No quotation records are available for your role."
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-paper lg:block">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-line bg-limestone text-xs text-stone">
                <tr>
                  <th className="px-4 py-3 font-medium">Quotation</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Context</th>
                  <th className="px-4 py-3 font-medium">Issued / valid</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotations.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/quotations/${quote.id}`}
                        className="font-semibold hover:text-brass-dark"
                      >
                        {quote.quotation_number}
                      </Link>
                      <p className="mt-1 text-xs text-stone">
                        Revision {quote.revision_number}
                        {quote.is_current ? " · Current" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {quote.customer?.name || "—"}
                      </p>
                      <p className="text-xs text-stone">
                        {quote.customer?.phone || ""}
                      </p>
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      <p>
                        {quote.enquiry
                          ? `ENQ-${String(quote.enquiry.enquiry_number).padStart(6, "0")}`
                          : "No enquiry"}
                      </p>
                      <p className="truncate text-xs text-stone">
                        {quote.site_visit
                          ? `SV-${String(quote.site_visit.visit_number).padStart(6, "0")} · ${quote.site_visit.site_address}`
                          : "No site visit"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{formatDate(quote.issue_date)}</p>
                      <p className="text-xs text-stone">
                        Valid {formatDate(quote.validity_date)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(quote.total, quote.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-sm border px-2 py-1 text-xs ${quotationStatusClass(quote.status, quote.validity_date)}`}
                      >
                        {quotationStatusLabel(
                          quote.status,
                          quote.validity_date,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {quote.owner?.full_name || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone">
                      {formatDate(quote.updated_at, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border lg:hidden">
            {quotations.map((quote) => (
              <Link
                key={quote.id}
                href={`/dashboard/quotations/${quote.id}`}
                className="block px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {quote.quotation_number}
                    </p>
                    <p className="truncate text-sm">
                      {quote.customer?.name || "Customer"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm border px-2 py-1 text-xs ${quotationStatusClass(quote.status, quote.validity_date)}`}
                  >
                    {quotationStatusLabel(quote.status, quote.validity_date)}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div className="text-xs text-stone">
                    <p>
                      Revision {quote.revision_number}
                      {quote.is_current ? " · Current" : ""}
                    </p>
                    <p>
                      {formatDate(quote.issue_date)} ·{" "}
                      {quote.owner?.full_name || "Unassigned"}
                    </p>
                  </div>
                  <strong className="text-sm">
                    {formatMoney(quote.total, quote.currency)}
                  </strong>
                </div>
                <p className="mt-2 text-xs text-stone">
                  Updated {formatDate(quote.updated_at, true)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
