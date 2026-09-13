import { z } from "zod";
import { isUuid } from "../crm/validation.ts";
import {
  HANDOVER_STATUSES,
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_FILE_CATEGORIES,
  PROJECT_PRIORITIES,
  PROJECT_UPDATE_TYPES,
} from "./constants.ts";
import { PROJECT_FILE_TYPES } from "./media.ts";

const uuid = z.string().refine(isUuid, "Invalid identifier.");
const optionalUuid = z.union([uuid, z.literal("")]);
const optionalDate = z.union([z.iso.date(), z.literal("")]);
export const projectDetailsSchema = z.object({
  status: z.enum(["planned", "active", "on_hold", "cancelled"]),
  priority: z.enum(PROJECT_PRIORITIES),
  start_date: optionalDate,
  expected_completion_date: optionalDate,
  installation_date: optionalDate,
  summary: z.string().max(4000),
  notes: z.string().max(12000),
});
export const stageTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000),
  sort_order: z.coerce.number().int().min(0).max(10000),
  is_active: z.boolean(),
  default_weight: z.coerce.number().positive().max(100),
});
export const assignmentSchema = z.object({
  project_id: uuid,
  user_id: uuid,
  assignment_role: z.enum(PROJECT_ASSIGNMENT_ROLES),
  enabled: z.boolean(),
});
export const stageTransitionSchema = z.object({
  project_id: uuid,
  stage_id: uuid,
  action: z.enum(["start", "complete", "block", "resume", "skip", "reopen"]),
  note: z.string().max(8000).optional().default(""),
});
export const stageDetailsSchema = z.object({
  assigned_to: optionalUuid,
  target_date: optionalDate,
  progress: z.coerce.number().int().min(0).max(99),
  notes: z.string().max(8000),
});
export const projectUpdateSchema = z.object({
  stage_id: optionalUuid,
  update_type: z.enum(PROJECT_UPDATE_TYPES),
  progress: z.union([z.coerce.number().int().min(0).max(100), z.literal("")]),
  note: z.string().trim().min(1).max(8000),
});
export const projectTaskSchema = z.object({
  project_stage_id: optionalUuid,
  assigned_to: optionalUuid,
  title: z.string().trim().min(2).max(300),
  description: z.string().max(4000),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  due_at: z.string().optional().default(""),
});
export const taskTransitionSchema = z.object({
  project_id: uuid,
  task_id: uuid,
  status: z.enum(["open", "in_progress", "blocked", "completed", "cancelled"]),
});
export const handoverSchema = z.object({
  status: z.enum(HANDOVER_STATUSES),
  handover_date: optionalDate,
  contact: z.string().max(200),
  notes: z.string().max(8000),
});
export const projectCompletionSchema = z.object({
  project_id: uuid,
  note: z.string().max(4000).optional().default(""),
});
export const projectFileSchema = z.object({
  project_id: uuid,
  stage_id: optionalUuid,
  file_type: z.enum(PROJECT_FILE_CATEGORIES),
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.enum(PROJECT_FILE_TYPES),
  file_size: z.number().int().positive().max(20 * 1024 * 1024),
  caption: z.string().max(1000).optional().default(""),
});
