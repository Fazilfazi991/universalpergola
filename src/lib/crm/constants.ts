export const CUSTOMER_TYPES = ["individual", "company"] as const;

export const ENQUIRY_SOURCES = [
  "SEO / Google Organic",
  "Instagram",
  "Facebook",
  "Google Ads",
  "Meta Ads",
  "WhatsApp",
  "Website",
  "Phone Call",
  "Walk-in",
  "Referral Person",
  "Existing Customer",
  "Other",
] as const;

export const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "follow_up",
  "site_visit_required",
  "quotation",
  "approved",
  "lost",
] as const;

export const LEAD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const CUSTOMER_TYPE_LABELS = {
  individual: "Individual",
  company: "Company",
} as const;
export const ENQUIRY_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  site_visit_required: "Site visit required",
  quotation: "Quotation",
  approved: "Approved",
  lost: "Lost",
} as const;

export const PRIORITY_LABELS = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
} as const;
