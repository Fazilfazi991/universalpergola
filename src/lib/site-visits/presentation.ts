import { SITE_VISIT_STATUS_LABELS } from "./constants.ts";
import type { SiteVisitStatus } from "./types.ts";

export function siteVisitReference(value: number) { return `SV-${String(value).padStart(6, "0")}`; }
export function siteVisitStatusLabel(value: SiteVisitStatus) { return SITE_VISIT_STATUS_LABELS[value]; }
export function siteVisitStatusClass(value: SiteVisitStatus) {
  if (value === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["cancelled", "no_show"].includes(value)) return "border-red-200 bg-red-50 text-red-800";
  if (value === "in_progress") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-line bg-limestone text-stone";
}

const activityLabels: Record<string, string> = {
  visit_created: "Site visit created", visit_assigned: "Site Team assigned", schedule_changed: "Schedule changed",
  status_changed: "Status changed", visit_started: "Visit started", visit_completed: "Visit completed",
  visit_cancelled: "Visit cancelled", visit_rescheduled: "Visit rescheduled", visit_no_show: "Marked no show",
  visit_updated: "Visit details updated", measurement_added: "Measurement added", measurement_updated: "Measurement updated",
  measurement_removed: "Measurement removed", photo_uploaded: "Photo uploaded", photo_removed: "Photo removed",
  note_added: "Note added", follow_up_created: "Follow-up added", follow_up_completed: "Follow-up completed",
  follow_up_rescheduled: "Follow-up rescheduled",
};
export function siteActivityLabel(value: string) { return activityLabels[value] || value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
