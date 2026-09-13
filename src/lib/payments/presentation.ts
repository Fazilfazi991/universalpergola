import { PAYMENT_METHOD_LABELS, PAYMENT_PLAN_LABELS, PAYMENT_STATUS_LABELS } from "./constants.ts";

export function paymentMethodLabel(value: string | null) {
  return value ? PAYMENT_METHOD_LABELS[value as keyof typeof PAYMENT_METHOD_LABELS] || value.replaceAll("_", " ") : "—";
}
export function paymentPlanLabel(value: string) {
  return PAYMENT_PLAN_LABELS[value] || value.replaceAll("_", " ");
}
export function paymentStatusLabel(value: string) {
  return PAYMENT_STATUS_LABELS[value] || value.replaceAll("_", " ");
}
export function paymentStatusClass(value: string) {
  if (value === "paid" || value === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "partially_paid" || value === "active") return "border-brass bg-brass/10 text-brass-dark";
  if (value === "overdue") return "border-red-200 bg-red-50 text-red-800";
  if (value === "cancelled") return "border-stone-300 bg-stone-100 text-stone-600";
  return "border-line bg-paper text-stone";
}
