import { z } from "zod";
import { CUSTOMER_TYPES, ENQUIRY_SOURCES, ENQUIRY_STATUSES, LEAD_PRIORITIES } from "./constants.ts";

const optional = (maximum: number) => z.string().trim().max(maximum, `Use ${maximum} characters or fewer.`);
const optionalEmail = z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.");
const optionalUuid = z.string().trim().refine((value) => !value || z.uuid().safeParse(value).success, "Choose a valid record.");
const optionalDateTime = z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Choose a valid date and time.");

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function isUuid(value: string) {
  return z.uuid().safeParse(value).success;
}

const practicalPhone = z.string().trim().max(40).refine((value) => !value || normalizePhone(value).length >= 7, "Enter a valid phone number.");

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer name.").max(160),
  customer_type: z.enum(CUSTOMER_TYPES),
  phone: practicalPhone,
  whatsapp_number: practicalPhone,
  email: optionalEmail,
  company_name: optional(160),
  address: optional(500),
  area: optional(120),
  emirate: optional(80),
  notes: optional(6000),
  source: optional(80),
  assigned_to: optionalUuid,
}).superRefine((value, context) => {
  if (!value.phone && !value.whatsapp_number && !value.email) {
    context.addIssue({ code: "custom", path: ["phone"], message: "Add a phone, WhatsApp number, or email." });
  }
  if (value.customer_type === "company" && !value.company_name) {
    context.addIssue({ code: "custom", path: ["company_name"], message: "Enter the company name." });
  }
});

export const publicEnquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(160),
  phone: practicalPhone.refine(Boolean, "Enter your phone number."),
  whatsapp_number: practicalPhone,
  email: optionalEmail,
  emirate: optional(80),
  message: z.string().trim().min(5, "Tell us briefly what you need.").max(4000),
  product_id: optionalUuid,
  product_slug: optional(96),
  website: z.string().max(0, "Unable to submit this enquiry."),
});

export const staffEnquirySchema = z.object({
  customer_id: optionalUuid,
  customer_name: optional(160),
  phone: practicalPhone,
  whatsapp_number: practicalPhone,
  email: optionalEmail,
  company_name: optional(160),
  customer_type: z.enum(CUSTOMER_TYPES),
  address: optional(500),
  area: optional(120),
  emirate: optional(80),
  source: z.enum(ENQUIRY_SOURCES),
  product_id: optionalUuid,
  subject: optional(200),
  message: z.string().trim().min(3, "Describe the enquiry.").max(6000),
  priority: z.enum(LEAD_PRIORITIES),
  assigned_to: optionalUuid,
  follow_up_at: optionalDateTime,
  next_action: optional(300),
  internal_notes: optional(6000),
}).superRefine((value, context) => {
  if (!value.customer_id) {
    if (value.customer_name.length < 2) context.addIssue({ code: "custom", path: ["customer_name"], message: "Enter a customer name or select an existing customer." });
    if (!value.phone && !value.whatsapp_number && !value.email) context.addIssue({ code: "custom", path: ["phone"], message: "Add a contact method for the new customer." });
  }
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
  priority: z.enum(LEAD_PRIORITIES),
  source: z.enum(ENQUIRY_SOURCES),
  assigned_to: optionalUuid,
  follow_up_at: optionalDateTime,
  next_action: optional(300),
  internal_notes: optional(6000),
});

export const followUpSchema = z.object({
  due_at: z.string().trim().min(1, "Choose a due date.").refine((value) => !Number.isNaN(Date.parse(value)), "Choose a valid due date."),
  next_action: z.string().trim().min(2, "Enter the next action.").max(200),
  notes: optional(2000),
  assigned_to: z.string().uuid("Choose a salesperson."),
});

export const noteSchema = z.object({ note: z.string().trim().min(2, "Enter a note.").max(4000) });
