import type { FeedbackStatus } from "./types";

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  not_requested: "Not requested",
  requested: "Requested",
  received: "Received",
  reviewed: "Reviewed",
  archived: "Archived",
};

export function feedbackStatusClass(status: FeedbackStatus) {
  if (status === "reviewed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "received") return "border-brass/40 bg-amber-50 text-amber-900";
  if (status === "requested") return "border-sky-200 bg-sky-50 text-sky-800";
  if (status === "archived") return "border-line bg-limestone text-stone";
  return "border-line bg-paper text-stone";
}
export function ratingLabel(value: number | null) {
  return value ? `${value} / 5` : "Not rated";
}
