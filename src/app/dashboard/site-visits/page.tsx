import Link from "next/link";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import {
  SITE_VISIT_STATUSES,
  SITE_VISIT_STATUS_LABELS,
} from "@/lib/site-visits/constants";
import {
  siteVisitReference,
  siteVisitStatusClass,
  siteVisitStatusLabel,
} from "@/lib/site-visits/presentation";
import {
  getSiteTeamDirectory,
  getSiteVisits,
  siteVisitFilters,
} from "@/lib/site-visits/queries";

export default async function SiteVisitsPage({
  searchParams,
}: PageProps<"/dashboard/site-visits">) {
  const [profile, params, siteStaff] = await Promise.all([
    requireModuleAccess("site-visits"),
    searchParams,
    getSiteTeamDirectory(),
  ]);
  const filters = siteVisitFilters(params);
  const visits = await getSiteVisits(filters);
  const canCreate = profile.role === "admin" || profile.role === "sales";
  return (
    <div className="space-y-7">
      <PageHeading
        title="Site visits"
        description="Scheduling, field measurements, site photos, and handoff notes in one queue."
        action={
          canCreate ? (
            <Link
              href="/dashboard/site-visits/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white"
            >
              <Plus size={17} />
              New site visit
            </Link>
          ) : undefined
        }
      />
      <form className="grid gap-3 border-y border-line bg-paper py-4 sm:rounded-lg sm:border sm:p-4 md:grid-cols-2 xl:grid-cols-4">
        <input
          className="min-h-11 rounded-md border border-line px-3 text-base xl:col-span-2"
          name="search"
          defaultValue={filters.search}
          placeholder="Reference, customer, phone, or site"
          aria-label="Search site visits"
        />
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="status"
          defaultValue={filters.status}
          aria-label="Visit status"
        >
          <option value="">Any status</option>
          {SITE_VISIT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {SITE_VISIT_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="assigned"
          defaultValue={filters.assigned}
          aria-label="Site Team member"
        >
          <option value="">Any Site Team member</option>
          <option value="unassigned">Unassigned</option>
          {siteStaff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.full_name}
            </option>
          ))}
        </select>
        <input
          className="min-h-11 rounded-md border border-line px-3 text-base"
          name="emirate"
          defaultValue={filters.emirate}
          placeholder="Emirate"
          aria-label="Emirate"
        />
        <input
          className="min-h-11 rounded-md border border-line px-3 text-base"
          name="date"
          type="date"
          defaultValue={filters.date}
          aria-label="Visit date"
        />
        <select
          className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"
          name="window"
          defaultValue={filters.window}
          aria-label="Timing"
        >
          <option value="">Any date</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="overdue">Overdue</option>
          <option value="active">Awaiting completion</option>
        </select>
        <button className="min-h-11 rounded-md border border-line bg-limestone px-4 text-sm font-medium">
          Apply
        </button>
      </form>
      {visits.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No site visits found"
          description={
            Object.values(filters).some(Boolean)
              ? "Adjust the filters to broaden the queue."
              : canCreate
                ? "Schedule the first visit from a customer or enquiry."
                : "No visits are assigned to you yet."
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-paper lg:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-line bg-limestone text-xs text-stone">
                <tr>
                  <th className="px-4 py-3 font-medium">Visit</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/site-visits/${visit.id}`}
                        className="font-semibold hover:text-brass-dark"
                      >
                        {siteVisitReference(visit.visit_number)}
                      </Link>
                      {visit.enquiry && (
                        <p className="mt-1 text-xs text-stone">
                          ENQ-
                          {String(visit.enquiry.enquiry_number).padStart(
                            6,
                            "0",
                          )}
                        </p>
                      )}
                      {visit.photoCount > 0 && <p className="mt-1 text-xs text-stone">📷 {visit.photoCount} {visit.photoCount === 1 ? "photo" : "photos"}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {visit.customer?.name || "—"}
                      </p>
                      <p className="text-xs text-stone">
                        {visit.customer?.phone || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(visit.scheduled_at, true)}
                    </td>
                    <td className="max-w-60 px-4 py-3">
                      <p className="truncate">{visit.site_address}</p>
                      <p className="text-xs text-stone">
                        {[visit.area, visit.emirate].filter(Boolean).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-sm border px-2 py-1 text-xs ${siteVisitStatusClass(visit.status)}`}
                      >
                        {siteVisitStatusLabel(visit.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {visit.assigned?.full_name || "Unassigned"}
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      <p className="truncate text-stone">
                        {visit.next_action ||
                          (visit.follow_up_required
                            ? "Follow-up required"
                            : "—")}
                      </p>
                      <p className="mt-1 text-xs text-stone">
                        Updated {formatDate(visit.updated_at, true)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border lg:hidden">
            {visits.map((visit) => (
              <Link
                key={visit.id}
                href={`/dashboard/site-visits/${visit.id}`}
                className="block px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {siteVisitReference(visit.visit_number)}
                    </p>
                    <p className="truncate text-sm">
                      {visit.customer?.name || "Customer"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm border px-2 py-1 text-xs ${siteVisitStatusClass(visit.status)}`}
                  >
                    {siteVisitStatusLabel(visit.status)}
                  </span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-stone">
                  <MapPin size={14} className="shrink-0" />
                  {visit.site_address}
                </p>
                <div className="mt-3 flex justify-between gap-3 text-xs text-stone">
                  <span>{formatDate(visit.scheduled_at, true)}</span>
                  <span>{visit.photoCount > 0 ? `📷 ${visit.photoCount}` : visit.assigned?.full_name || "Unassigned"}</span>
                </div>
                <p className="mt-2 text-xs text-stone">
                  Updated {formatDate(visit.updated_at, true)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
