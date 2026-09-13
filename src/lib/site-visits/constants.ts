export const SITE_VISIT_STATUSES = ["scheduled", "confirmed", "in_progress", "completed", "rescheduled", "cancelled", "no_show"] as const;
export const SITE_VISIT_STATUS_LABELS: Record<(typeof SITE_VISIT_STATUSES)[number], string> = {
  scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed",
  rescheduled: "Rescheduled", cancelled: "Cancelled", no_show: "No show",
};
export const MEASUREMENT_UNITS = ["mm", "cm", "m"] as const;
export const PHOTO_TYPE_SUGGESTIONS = ["Existing condition", "Measurement reference", "Electrical point", "Ceiling", "Wall", "Access", "Installation constraint"] as const;

export const SITE_VISIT_TRANSITIONS: Record<(typeof SITE_VISIT_STATUSES)[number], readonly (typeof SITE_VISIT_STATUSES)[number][]> = {
  scheduled: ["confirmed", "rescheduled", "cancelled", "no_show"],
  confirmed: ["in_progress", "rescheduled", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rescheduled: ["scheduled", "confirmed", "cancelled", "no_show"],
  cancelled: [],
  no_show: ["rescheduled", "cancelled"],
};
