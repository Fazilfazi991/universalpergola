export const PAYMENT_METHODS = ["bank_transfer", "online_transfer", "cash", "card", "cheque", "other"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  bank_transfer: "Bank transfer",
  online_transfer: "Online transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};
export const PAYMENT_PLAN_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};
