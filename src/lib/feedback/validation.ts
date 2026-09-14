import { z } from "zod";

const uuid = z.uuid("Invalid reference.");
const rating = z.coerce.number().int().min(1).max(5);

export const requestFeedbackSchema = z.object({
  project_id: uuid,
  expires_at: z.iso.datetime(),
});
export const staffFeedbackSchema = z.object({
  project_id: uuid,
  rating,
  comment: z.string().trim().max(4000),
  source: z.string().trim().min(1).max(120),
  permission: z.boolean(),
  internal_notes: z.string().trim().max(8000),
});

export const reviewFeedbackSchema = z.object({
  feedback_id: uuid,
  project_id: uuid,
  status: z.enum(["reviewed", "archived"]),
  internal_notes: z.string().trim().max(8000),
});

export const publicFeedbackSchema = z.object({
  token: uuid,
  rating,
  comment: z.string().trim().max(4000),
  permission: z.boolean(),
  website: z.string().max(200),
});

export const checklistSchema = z.object({
  project_id: uuid,
  key: z.enum([
    "installation_complete", "site_cleaned", "final_testing_complete",
    "customer_handover_complete", "handover_documents_provided",
    "completion_photos_uploaded", "snag_items_reviewed", "feedback_requested",
  ]),
  completed: z.boolean(),
  note: z.string().trim().max(2000),
});
