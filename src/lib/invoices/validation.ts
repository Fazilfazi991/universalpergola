import { z } from "zod";
import type { InvoiceDraftPayload } from "./types";

const amount = z.coerce.number().finite().min(0).max(99_999_999);
const positive = z.coerce.number().finite().gt(0).max(999_999);

const invoiceLineSchema = z.object({
  item_name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).default(""),
  quantity: positive,
  unit: z.string().trim().min(1).max(40),
  unit_price: amount,
  discount_amount: amount.default(0),
  taxable: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(999),
}).refine((item) => item.discount_amount <= item.quantity * item.unit_price, {
  message: "A line discount cannot exceed its gross amount.",
});

const invoiceDraftSchema = z.object({
  issue_date: z.string().date(),
  due_date: z.union([z.literal(""), z.string().date()]),
  discount_type: z.enum(["fixed", "percentage"]),
  discount_value: amount,
  vat_rate: z.coerce.number().finite().min(0).max(100),
  notes: z.string().trim().max(8000),
  terms: z.string().trim().max(12000),
  items: z.array(invoiceLineSchema).min(1).max(100),
}).superRefine((value, context) => {
  if (value.due_date && value.due_date < value.issue_date) {
    context.addIssue({ code: "custom", path: ["due_date"], message: "Due date cannot be before the issue date." });
  }
  if (value.discount_type === "percentage" && value.discount_value > 100) {
    context.addIssue({ code: "custom", path: ["discount_value"], message: "Percentage discount cannot exceed 100%." });
  }
});

export function parseInvoiceDraft(formData: FormData) {
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    items = [];
  }
  return invoiceDraftSchema.safeParse({
    issue_date: String(formData.get("issue_date") || ""),
    due_date: String(formData.get("due_date") || ""),
    discount_type: String(formData.get("discount_type") || "fixed"),
    discount_value: String(formData.get("discount_value") || "0"),
    vat_rate: String(formData.get("vat_rate") || "5"),
    notes: String(formData.get("notes") || ""),
    terms: String(formData.get("terms") || ""),
    items,
  }) as ReturnType<typeof invoiceDraftSchema.safeParse> & { data?: InvoiceDraftPayload };
}

export const invoiceIdSchema = z.string().uuid();
export const invoiceTransitionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["issue", "cancel"]),
  reason: z.string().trim().max(2000).default(""),
}).superRefine((value, context) => {
  if (value.action === "cancel" && value.reason.length < 3) {
    context.addIssue({ code: "custom", path: ["reason"], message: "Add a cancellation reason." });
  }
});
