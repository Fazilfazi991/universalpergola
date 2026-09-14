export const QUOTATION_STATUSES = [
  "draft",
  "ready",
  "sent",
  "revised",
  "approved",
  "rejected",
  "expired",
  "cancelled",
] as const;

export const QUOTATION_STATUS_LABELS: Record<
  (typeof QUOTATION_STATUSES)[number],
  string
> = {
  draft: "Draft",
  ready: "Ready for review",
  sent: "Sent",
  revised: "Superseded by revision",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const QUOTATION_TRANSITIONS: Record<
  (typeof QUOTATION_STATUSES)[number],
  readonly (typeof QUOTATION_STATUSES)[number][]
> = {
  draft: ["ready", "cancelled"],
  ready: ["draft", "sent", "cancelled"],
  sent: ["revised", "approved", "rejected", "expired"],
  revised: [],
  approved: [],
  rejected: [],
  expired: [],
  cancelled: [],
};

export const QUOTATION_UNITS = [
  "item",
  "set",
  "m",
  "m²",
  "lot",
  "service",
] as const;
export { DEFAULT_QUOTATION_TERMS } from "../documents/config.ts";
