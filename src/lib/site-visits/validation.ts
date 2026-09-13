import { z } from "zod";
import { MEASUREMENT_UNITS, SITE_VISIT_STATUSES } from "./constants.ts";
import { isValidSitePhotoPath, MAX_SITE_PHOTO_BYTES, SITE_PHOTO_TYPES } from "./media.ts";

const optional = (maximum: number) => z.string().trim().max(maximum);
const optionalUuid = z.string().trim().refine((value) => !value || z.uuid().safeParse(value).success, "Choose a valid record.");
const dateTime = z.string().trim().min(1, "Choose a date and time.").refine((value) => !Number.isNaN(Date.parse(value)), "Choose a valid date and time.");
const practicalPhone = z.string().trim().max(40).refine((value) => !value || value.replace(/\D/g, "").length >= 7, "Enter a valid phone number.");
const mapsUrl = z.string().trim().max(1000).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"].includes(url.hostname); }
  catch { return false; }
}, "Enter a Google Maps HTTPS link.");
const optionalNumber = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().positive().max(1_000_000).optional());

export const siteVisitCreateSchema = z.object({
  customer_id: z.string().uuid("Choose a customer."), enquiry_id: optionalUuid, assigned_to: optionalUuid,
  scheduled_at: dateTime, site_address: z.string().trim().min(2, "Enter the site address.").max(500),
  area: optional(120), emirate: optional(80), location_url: mapsUrl, contact_person: optional(160), contact_phone: practicalPhone,
  notes: optional(8000), next_action: optional(300), next_action_at: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Choose a valid date and time."),
});

export const siteVisitUpdateSchema = siteVisitCreateSchema.omit({ customer_id: true, enquiry_id: true, assigned_to: true });
export const siteVisitContentSchema = z.object({ measurement_summary: optional(4000), notes: optional(8000), follow_up_required: z.boolean(), next_action: optional(300), next_action_at: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Choose a valid date and time.") });
export const siteVisitTransitionSchema = z.object({ status: z.enum(SITE_VISIT_STATUSES), scheduled_at: z.string().trim().optional() });

export const measurementSchema = z.object({
  label: z.string().trim().min(2, "Add a measurement label.").max(120), width: optionalNumber, height: optionalNumber,
  length: optionalNumber, unit: z.enum(MEASUREMENT_UNITS), quantity: z.coerce.number().positive().max(1000),
  notes: optional(1000), sort_order: z.coerce.number().int().min(-10000).max(10000),
}).superRefine((value, context) => {
  if (value.width === undefined && value.height === undefined && value.length === undefined) context.addIssue({ code: "custom", path: ["width"], message: "Add at least one dimension." });
});

export const siteFollowUpSchema = z.object({ due_at: dateTime, next_action: z.string().trim().min(2).max(200), notes: optional(2000), assigned_to: z.string().uuid("Choose an assignee.") });
export const siteNoteSchema = z.object({ note: z.string().trim().min(2, "Enter a note.").max(4000) });
export const photoMetadataSchema = z.object({
  site_visit_id: z.string().uuid(), storage_path: z.string(), caption: optional(300), photo_type: optional(80),
  mime_type: z.enum(SITE_PHOTO_TYPES), file_size: z.number().int().min(1).max(MAX_SITE_PHOTO_BYTES), sort_order: z.number().int().min(-10000).max(10000),
}).refine((value) => isValidSitePhotoPath(value.storage_path, value.site_visit_id), { message: "Invalid site photo path.", path: ["storage_path"] });
