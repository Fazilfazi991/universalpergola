import { z } from "zod";
import { PAYMENT_METHODS } from "./constants";
import { PAYMENT_PROOF_TYPES } from "./media";

const uuid = z.string().uuid("Invalid identifier.");
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const money = z.coerce.number().finite().positive().max(99_999_999_999.99);
export const milestoneSchema = z.object({
  project_id: uuid,
  milestone_id: z.union([uuid, z.literal("")]).default(""),
  name: z.string().trim().min(1, "Milestone name is required.").max(160),
  description: optionalText(2000),
  milestone_type: z.enum(["percentage", "fixed"]),
  percentage: z.union([z.coerce.number().positive().max(100), z.nan()]).optional(),
  fixed_amount: z.union([money, z.nan()]).optional(),
  due_date: z.string().date().or(z.literal("")),
  notes: optionalText(2000),
  sort_order: z.coerce.number().int().min(0).max(10000),
}).superRefine((value, ctx) => {
  if (value.milestone_type === "percentage" && (!value.percentage || Number.isNaN(value.percentage))) ctx.addIssue({ code: "custom", path: ["percentage"], message: "Enter a percentage." });
  if (value.milestone_type === "fixed" && (!value.fixed_amount || Number.isNaN(value.fixed_amount))) ctx.addIssue({ code: "custom", path: ["fixed_amount"], message: "Enter a fixed amount." });
});
export const receiptSchema = z.object({
  project_id: uuid,
  milestone_id: uuid,
  amount: money,
  received_date: z.string().date(),
  payment_method: z.enum(PAYMENT_METHODS),
  reference_number: optionalText(160),
  notes: optionalText(2000),
});
export const reasonSchema = z.object({ id: uuid, project_id: uuid.optional(), reason: z.string().trim().min(3).max(1000) });
export const proofSchema = z.object({
  payment_id: uuid,
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.enum(PAYMENT_PROOF_TYPES),
  file_size: z.number().int().min(1).max(10 * 1024 * 1024),
});
