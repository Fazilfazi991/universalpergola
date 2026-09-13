import { ENQUIRY_STATUS_LABELS, PRIORITY_LABELS } from "./constants.ts";

export function enquiryReference(value: number) {
  return `ENQ-${String(value).padStart(6, "0")}`;
}

export function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-AE", includeTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }
    : { dateStyle: "medium", timeZone: "Asia/Dubai" }).format(new Date(value));
}

export function formatPhoneLink(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function formatWhatsAppLink(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function statusLabel(value: keyof typeof ENQUIRY_STATUS_LABELS) {
  return ENQUIRY_STATUS_LABELS[value];
}

export function priorityLabel(value: keyof typeof PRIORITY_LABELS) {
  return PRIORITY_LABELS[value];
}

const activityLabels: Record<string, string> = {
  enquiry_created: "Enquiry created",
  salesperson_assigned: "Salesperson assigned",
  status_changed: "Status changed",
  priority_changed: "Priority changed",
  follow_up_created: "Follow-up added",
  follow_up_completed: "Follow-up completed",
  follow_up_cancelled: "Follow-up cancelled",
  follow_up_rescheduled: "Follow-up rescheduled",
  note_added: "Note added",
  contacted: "Customer contacted",
};

export function activityLabel(value: string) {
  return activityLabels[value] || value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function followUpStatusLabel(value: string) {
  if (value === "open" || value === "in_progress") return "Pending";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function priorityClass(value: string) {
  if (value === "urgent") return "border-red-200 bg-red-50 text-red-800";
  if (value === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-line bg-limestone text-stone";
}
