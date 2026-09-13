import { z } from "zod";
import { QUOTATION_STATUSES } from "./constants.ts";

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.string().uuid().nullable(),
);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().trim().max(max).nullable(),
  );
const decimal = (label: string, max: number, positive = false) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number()
      .min(positive ? 0.001 : 0, `${label} cannot be negative.`)
      .max(max, `${label} is too large.`),
  );
const optionalDecimal = (label: string, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce
      .number()
      .positive(`${label} must be positive.`)
      .max(max)
      .nullable(),
  );
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const quotationItemSchema = z
  .object({
    product_id: optionalUuid,
    source_measurement_id: optionalUuid,
    item_name: z.string().trim().min(1, "Enter an item name.").max(200),
    description: z.string().trim().max(8000),
    quantity: decimal("Quantity", 999999, true),
    unit: z.string().trim().min(1).max(40),
    width: optionalDecimal("Width", 999999999),
    height: optionalDecimal("Height", 999999999),
    length: optionalDecimal("Length", 999999999),
    dimensions_details: optionalText(2000),
    unit_price: decimal("Unit price", 999999999999),
    discount_amount: decimal("Line discount", 999999999999),
    taxable: z.boolean(),
    sort_order: z.coerce.number().int().min(-10000).max(10000),
  })
  .superRefine((item, context) => {
    if (
      item.discount_amount >
      Math.round(item.quantity * item.unit_price * 100) / 100
    ) {
      context.addIssue({
        code: "custom",
        path: ["discount_amount"],
        message: "Line discount cannot exceed the gross amount.",
      });
    }
  });

export const quotationDraftSchema = z
  .object({
    id: optionalUuid,
    customer_id: z.string().uuid("Choose a customer."),
    enquiry_id: optionalUuid,
    site_visit_id: optionalUuid,
    owner_id: optionalUuid,
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
    issue_date: date,
    validity_date: date,
    customer_name_snapshot: z.string().trim().min(1).max(200),
    customer_company_snapshot: optionalText(200),
    customer_phone_snapshot: optionalText(50),
    customer_email_snapshot: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.string().email().max(320).nullable(),
    ),
    site_address_snapshot: optionalText(2000),
    introduction: optionalText(4000),
    internal_notes: optionalText(8000),
    customer_notes: optionalText(8000),
    terms: optionalText(12000),
    discount_type: z.enum(["fixed", "percentage"]),
    discount_value: decimal("Discount", 999999999999),
    vat_rate: decimal("VAT rate", 100),
    items: z
      .array(quotationItemSchema)
      .min(1, "Add at least one item.")
      .max(100),
  })
  .superRefine((quote, context) => {
    if (quote.validity_date < quote.issue_date) {
      context.addIssue({
        code: "custom",
        path: ["validity_date"],
        message: "Valid until cannot be before the issue date.",
      });
    }
    if (quote.discount_type === "percentage" && quote.discount_value > 100) {
      context.addIssue({
        code: "custom",
        path: ["discount_value"],
        message: "Percentage discount cannot exceed 100%.",
      });
    }
  });

export const quotationTransitionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(QUOTATION_STATUSES),
  note: z.string().trim().max(2000).optional(),
});

export function parseQuotationDraft(formData: FormData) {
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    items = [];
  }
  return quotationDraftSchema.safeParse({
    ...Object.fromEntries(formData),
    items,
  });
}
