import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  MapPin,
  Phone,
  Play,
  Ruler,
  Send,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  assignSiteVisitAction,
  completeSiteFollowUpAction,
  removeSiteMeasurementAction,
  removeSitePhotoAction,
  transitionSiteVisitAction,
  updateSiteMeasurementAction,
  updateSitePhotoAction,
} from "@/app/dashboard/site-visits/actions";
import {
  AddMeasurementForm,
  SiteFollowUpForm,
  SitePhotoUploader,
  SiteVisitNoteForm,
  VisitContentEditor,
  VisitScheduleEditor,
} from "@/components/dashboard/site-visit-controls";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import {
  formatDate,
  formatPhoneLink,
  formatWhatsAppLink,
} from "@/lib/crm/presentation";
import {
  MEASUREMENT_UNITS,
  PHOTO_TYPE_SUGGESTIONS,
  SITE_VISIT_TRANSITIONS,
} from "@/lib/site-visits/constants";
import {
  siteActivityLabel,
  siteVisitReference,
  siteVisitStatusClass,
  siteVisitStatusLabel,
} from "@/lib/site-visits/presentation";
import {
  getSiteTeamDirectory,
  getSiteVisit,
  getSiteVisitWorkspace,
  getVisitTaskDirectory,
  type SiteMeasurement,
} from "@/lib/site-visits/queries";
import type { SiteVisitStatus } from "@/lib/site-visits/types";
import { formatMoney } from "@/lib/quotations/money";
import {
  quotationStatusClass,
  quotationStatusLabel,
} from "@/lib/quotations/presentation";
import { getSiteVisitQuotations } from "@/lib/quotations/queries";

const input =
  "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";
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
function TransitionButton({
  id,
  status,
  label,
  icon: Icon,
}: {
  id: string;
  status: SiteVisitStatus;
  label: string;
  icon?: typeof Check;
}) {
  return (
    <form action={transitionSiteVisitAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white">
        {Icon && <Icon size={16} />}
        {label}
      </button>
    </form>
  );
}

function MeasurementEditor({
  item,
  visitId,
}: {
  item: SiteMeasurement;
  visitId: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <form
        action={updateSiteMeasurementAction}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="site_visit_id" value={visitId} />
        <label className="grid gap-1 text-xs font-medium xl:col-span-2">
          Label
          <input
            className={input}
            name="label"
            defaultValue={item.label}
            required
            maxLength={120}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Width
          <input
            className={input}
            name="width"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={item.width ?? ""}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Height
          <input
            className={input}
            name="height"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={item.height ?? ""}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Length / depth
          <input
            className={input}
            name="length"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={item.length ?? ""}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Unit
          <select className={input} name="unit" defaultValue={item.unit}>
            {MEASUREMENT_UNITS.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Quantity
          <input
            className={input}
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={item.quantity}
            required
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Order
          <input
            className={input}
            name="sort_order"
            type="number"
            defaultValue={item.sort_order}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium sm:col-span-2 xl:col-span-4">
          Notes
          <input
            className={input}
            name="notes"
            defaultValue={item.notes || ""}
            maxLength={1000}
          />
        </label>
        <button className="min-h-10 justify-self-start text-sm font-medium text-brass-dark">
          Save measurement
        </button>
      </form>
      <form action={removeSiteMeasurementAction} className="mt-1">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="site_visit_id" value={visitId} />
        <button className="min-h-10 text-sm font-medium text-red-700">
          Remove
        </button>
      </form>
    </div>
  );
}

export default async function SiteVisitPage({
  params,
  searchParams,
}: PageProps<"/dashboard/site-visits/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const [profile, visit, workspace, siteStaff, taskStaff, quotations] =
    await Promise.all([
      requireModuleAccess("site-visits"),
      getSiteVisit(id),
      getSiteVisitWorkspace(id),
      getSiteTeamDirectory(),
      getVisitTaskDirectory(),
      getSiteVisitQuotations(id),
    ]);
  if (!visit) notFound();
  const canOperate = profile.role === "admin" || profile.role === "site_team";
  const canManage = profile.role === "admin";
  const phoneHref = formatPhoneLink(
    visit.contact_phone || visit.customer?.phone,
  );
  const whatsappHref = formatWhatsAppLink(
    visit.customer?.whatsapp_number ||
      visit.contact_phone ||
      visit.customer?.phone,
  );
  const transitions = SITE_VISIT_TRANSITIONS[visit.status].filter(
    (status) =>
      canManage ||
      ["confirmed", "in_progress", "completed", "no_show"].includes(status),
  );
  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/site-visits"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"
      >
        <ArrowLeft size={16} />
        Back to site visits
      </Link>
      <PageHeading
        title={siteVisitReference(visit.visit_number)}
        description={`${visit.customer?.name || "Customer"} · ${formatDate(visit.scheduled_at, true)}`}
      />
      {typeof query.created === "string" && (
        <StatusNotice tone="success" title={`${query.created} scheduled`}>
          <p>The site visit is ready for assignment and field work.</p>
        </StatusNotice>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-sm border px-3 py-2 text-sm ${siteVisitStatusClass(visit.status)}`}
        >
          {siteVisitStatusLabel(visit.status)}
        </span>
        {phoneHref && (
          <a
            href={phoneHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm"
          >
            <Phone size={16} />
            Call
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm"
          >
            <Send size={16} />
            WhatsApp
          </a>
        )}
        {visit.location_url && (
          <a
            href={visit.location_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm"
          >
            <MapPin size={16} />
            Open map
          </a>
        )}
        {canOperate && transitions.includes("confirmed") && (
          <TransitionButton
            id={id}
            status="confirmed"
            label="Confirm"
            icon={Check}
          />
        )}
        {canOperate && transitions.includes("in_progress") && (
          <TransitionButton
            id={id}
            status="in_progress"
            label="Start visit"
            icon={Play}
          />
        )}
        {canOperate && transitions.includes("completed") && (
          <TransitionButton
            id={id}
            status="completed"
            label="Complete visit"
            icon={Check}
          />
        )}
        {canOperate && transitions.includes("no_show") && (
          <TransitionButton id={id} status="no_show" label="No show" />
        )}
        {canManage && transitions.includes("cancelled") && (
          <TransitionButton id={id} status="cancelled" label="Cancel" />
        )}
      </div>
      {canManage && transitions.includes("rescheduled") && (
        <form
          action={transitionSiteVisitAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-limestone p-4"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="rescheduled" />
          <label className="grid gap-2 text-sm font-medium">
            Reschedule to
            <input
              className={input}
              name="scheduled_at"
              type="datetime-local"
              required
            />
          </label>
          <button className="min-h-11 rounded-md border border-line bg-paper px-4 text-sm font-medium">
            Reschedule
          </button>
        </form>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)]">
        <div className="space-y-6">
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Visit summary</h2>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Customer">
                {visit.customer ? (
                  <Link
                    href={`/dashboard/customers/${visit.customer.id}`}
                    className="font-medium text-brass-dark"
                  >
                    {visit.customer.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Linked enquiry">
                {visit.enquiry ? (
                  <Link
                    href={`/dashboard/enquiries/${visit.enquiry.id}`}
                    className="font-medium text-brass-dark"
                  >
                    ENQ-{String(visit.enquiry.enquiry_number).padStart(6, "0")}
                  </Link>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Scheduled">
                {formatDate(visit.scheduled_at, true)}
              </Detail>
              <Detail label="Site Team">
                {visit.assigned?.full_name || "Unassigned"}
              </Detail>
              <Detail label="Site address">{visit.site_address}</Detail>
              <Detail label="Area / emirate">
                {[visit.area, visit.emirate].filter(Boolean).join(", ") || "—"}
              </Detail>
              <Detail label="Site contact">
                {visit.contact_person || visit.customer?.name || "—"}
              </Detail>
              <Detail label="Contact phone">
                {visit.contact_phone || visit.customer?.phone || "—"}
              </Detail>
            </dl>
          </section>
          {canManage && (
            <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
              <h2 className="text-lg font-semibold">Schedule and site</h2>
              <div className="mt-5">
                <VisitScheduleEditor visit={visit} />
              </div>
            </section>
          )}
          <section>
            <div className="flex items-center gap-2">
              <Ruler size={18} />
              <h2 className="text-lg font-semibold">Measurements</h2>
            </div>
            <div className="mt-4 space-y-3">
              {workspace.measurements.length ? (
                workspace.measurements.map((item) =>
                  canOperate ? (
                    <MeasurementEditor key={item.id} item={item} visitId={id} />
                  ) : (
                    <div
                      key={item.id}
                      className="rounded-lg border border-line bg-paper p-4"
                    >
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-2 text-sm text-stone">
                        {[
                          item.width && `W ${item.width}`,
                          item.height && `H ${item.height}`,
                          item.length && `L ${item.length}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}{" "}
                        {item.unit} · Qty {item.quantity}
                      </p>
                      {item.notes && (
                        <p className="mt-2 text-sm">{item.notes}</p>
                      )}
                    </div>
                  ),
                )
              ) : (
                <p className="border-y border-line bg-paper px-4 py-8 text-center text-sm text-stone sm:rounded-lg sm:border">
                  No structured measurements yet.
                </p>
              )}
              {canOperate && (
                <AddMeasurementForm
                  visitId={id}
                  nextOrder={
                    (workspace.measurements.at(-1)?.sort_order || 0) + 10
                  }
                />
              )}
            </div>
          </section>
          <section>
            <div className="flex items-center gap-2">
              <Camera size={18} />
              <h2 className="text-lg font-semibold">Site photos</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {workspace.photos.map((photo) => (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-lg border border-line bg-paper"
                >
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={
                        photo.caption || photo.photo_type || "Site visit photo"
                      }
                      width={960}
                      height={720}
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-limestone text-sm text-stone">
                      Preview unavailable
                    </div>
                  )}
                  {canOperate ? (
                    <div className="p-4">
                      <form
                        action={updateSitePhotoAction}
                        className="space-y-3"
                      >
                        <input type="hidden" name="id" value={photo.id} />
                        <input type="hidden" name="site_visit_id" value={id} />
                        <input
                          className={input}
                          name="photo_type"
                          defaultValue={photo.photo_type || ""}
                          list="photo-type-options"
                          maxLength={80}
                          aria-label="Photo category"
                        />
                        <input
                          className={input}
                          name="caption"
                          defaultValue={photo.caption || ""}
                          maxLength={300}
                          placeholder="Caption"
                          aria-label="Photo caption"
                        />
                        <input
                          className={input}
                          name="sort_order"
                          type="number"
                          defaultValue={photo.sort_order}
                          aria-label="Photo order"
                        />
                        <button className="min-h-10 text-sm font-medium text-brass-dark">
                          Save photo details
                        </button>
                      </form>
                      <form action={removeSitePhotoAction}>
                        <input type="hidden" name="id" value={photo.id} />
                        <input type="hidden" name="site_visit_id" value={id} />
                        <button className="min-h-10 text-sm font-medium text-red-700">
                          Remove photo
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm font-medium">
                        {photo.photo_type || "Site photo"}
                      </p>
                      <p className="mt-1 text-sm text-stone">
                        {photo.caption || "No caption"}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <datalist id="photo-type-options">
              {PHOTO_TYPE_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {workspace.photos.length === 0 && (
              <p className="mt-4 border-y border-line bg-paper px-4 py-8 text-center text-sm text-stone sm:rounded-lg sm:border">
                No site photos yet.
              </p>
            )}
            {canOperate && (
              <div className="mt-5 border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
                <SitePhotoUploader
                  visitId={id}
                  existingCount={workspace.photos.length}
                />
              </div>
            )}
          </section>
          {canOperate && (
            <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
              <h2 className="text-lg font-semibold">Notes and handoff</h2>
              <div className="mt-5">
                <VisitContentEditor visit={visit} />
              </div>
            </section>
          )}
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Quotations</h2>
                <p className="mt-1 text-sm text-stone">
                  Commercial offers created from this field record.
                </p>
              </div>
              {(profile.role === "admin" || profile.role === "sales") && (
                <Link
                  href={`/dashboard/quotations/new?customer=${visit.customer_id}&enquiry=${visit.enquiry_id || ""}&visit=${id}`}
                  className="min-h-10 py-2 text-sm font-medium text-brass-dark"
                >
                  Create quotation
                </Link>
              )}
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {quotations.length ? (
                quotations.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/dashboard/quotations/${quote.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {quote.quotation_number}
                      </p>
                      <p className="mt-1 text-xs text-stone">
                        Revision {quote.revision_number} ·{" "}
                        {formatMoney(quote.total, quote.currency)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-sm border px-2 py-1 text-xs ${quotationStatusClass(quote.status, quote.validity_date)}`}
                    >
                      {quotationStatusLabel(quote.status, quote.validity_date)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  No quotations created from this visit.
                </p>
              )}
            </div>
          </section>
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Activity timeline</h2>
            <ol className="mt-5 border-l border-line pl-6">
              {workspace.timeline.length ? (
                workspace.timeline.map((item) => (
                  <li key={item.id} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[1.72rem] top-1 size-2 rounded-full bg-brass" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {siteActivityLabel(item.activity_type)}
                      </p>
                      <time className="text-xs text-stone">
                        {formatDate(item.occurred_at, true)}
                      </time>
                    </div>
                    {item.note && (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone">
                        {item.note}
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
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Assignment</h2>
            {canManage ? (
              <form action={assignSiteVisitAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <select
                  name="assigned_to"
                  defaultValue={visit.assigned_to || ""}
                  className={input}
                >
                  <option value="">Unassigned</option>
                  {siteStaff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
                <button className="min-h-10 text-sm font-medium text-brass-dark">
                  Save assignment
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-stone">
                {visit.assigned?.full_name || "Unassigned"}
              </p>
            )}
          </section>
          <section className="rounded-lg border border-line bg-paper p-5">
            <div className="flex items-center gap-2">
              <Clock3 size={17} />
              <h2 className="text-base font-semibold">Follow-ups</h2>
            </div>
            <div className="mt-4 divide-y divide-line">
              {workspace.followUps.length ? (
                workspace.followUps.map((task) => (
                  <div key={task.id} className="py-3 first:pt-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="mt-1 text-xs text-stone">
                      {task.assigned?.full_name || "Unassigned"} ·{" "}
                      {formatDate(task.due_at, true)} · {task.status}
                    </p>
                    {task.description && (
                      <p className="mt-2 text-sm text-stone">
                        {task.description}
                      </p>
                    )}
                    {canOperate &&
                      task.status !== "completed" &&
                      task.status !== "cancelled" && (
                        <form
                          action={completeSiteFollowUpAction}
                          className="mt-2"
                        >
                          <input type="hidden" name="id" value={task.id} />
                          <input
                            type="hidden"
                            name="site_visit_id"
                            value={id}
                          />
                          <button className="min-h-10 text-sm font-medium text-emerald-700">
                            Complete
                          </button>
                        </form>
                      )}
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-stone">No follow-ups yet.</p>
              )}
            </div>
            {canOperate && (
              <div className="mt-4 border-t border-line pt-4">
                <SiteFollowUpForm
                  visit={visit}
                  staff={taskStaff}
                  role={profile.role}
                  currentUserId={profile.id}
                />
              </div>
            )}
          </section>
          {canOperate && (
            <section className="rounded-lg border border-line bg-paper p-5">
              <SiteVisitNoteForm visitId={id} />
            </section>
          )}
          <section className="rounded-lg border border-line bg-limestone p-5">
            <h2 className="text-sm font-semibold">Completion checklist</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone">
              <li>{visit.assigned_to ? "✓" : "○"} Site Team assigned</li>
              <li>
                {workspace.measurements.length ? "✓" : "○"} Structured
                measurement recorded
              </li>
              <li>
                {visit.measurement_summary || visit.notes ? "✓" : "○"} Summary
                or notes recorded
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
