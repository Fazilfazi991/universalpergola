import {
  HANDOVER_STATUS_LABELS,
  PROJECT_ASSIGNMENT_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_UPDATE_LABELS,
  STAGE_STATUS_LABELS,
} from "./constants.ts";
import type {
  HandoverStatus,
  ProjectAssignmentRole,
  ProjectPriority,
  ProjectStatus,
  ProjectUpdateType,
  StageStatus,
} from "./types.ts";

export function projectStatusLabel(value: string) {
  return PROJECT_STATUS_LABELS[value as ProjectStatus] || value.replaceAll("_", " ");
}
export function projectPriorityLabel(value: string) {
  return PROJECT_PRIORITY_LABELS[value as ProjectPriority] || value;
}
export function stageStatusLabel(value: string) {
  return STAGE_STATUS_LABELS[value as StageStatus] || value.replaceAll("_", " ");
}
export function handoverStatusLabel(value: string) {
  return HANDOVER_STATUS_LABELS[value as HandoverStatus] || value.replaceAll("_", " ");
}
export function assignmentRoleLabel(value: string) {
  return PROJECT_ASSIGNMENT_LABELS[value as ProjectAssignmentRole] || value.replaceAll("_", " ");
}
export function projectUpdateLabel(value: string) {
  return PROJECT_UPDATE_LABELS[value as ProjectUpdateType] || value.replaceAll("_", " ");
}
export function projectStatusClass(value: string) {
  if (value === "active") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "on_hold") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "completed") return "border-stone-300 bg-stone-100 text-stone-700";
  if (value === "cancelled") return "border-red-200 bg-red-50 text-red-800";
  return "border-line bg-paper text-stone";
}
export function stageStatusClass(value: string) {
  if (value === "in_progress") return "border-brass bg-brass/10 text-brass-dark";
  if (value === "blocked") return "border-red-200 bg-red-50 text-red-800";
  if (value === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "skipped") return "border-stone-300 bg-stone-100 text-stone-600";
  return "border-line bg-paper text-stone";
}

const activityLabels: Record<string, string> = {
  "project.created": "Project created",
  "project.started": "Project started",
  "project.status_changed": "Project status changed",
  "project.completed": "Project completed",
  "project.reopened": "Project reopened",
  "stage.started": "Stage started",
  "stage.completed": "Stage completed",
  "stage.blocked": "Stage blocked",
  "stage.resumed": "Stage resumed",
  "stage.skipped": "Stage skipped",
  "stage.reopened": "Stage reopened",
  "staff.assigned": "Staff assigned",
  "staff.unassigned": "Staff unassigned",
  "assignment.changed": "Assignment changed",
  "task.created": "Task created",
  "task.completed": "Task completed",
  "project.update_added": "Project update added",
  "file.uploaded": "Project file uploaded",
  "file.deleted": "Project file deleted",
  "installation.scheduled": "Installation scheduled",
  "handover.ready": "Handover marked ready",
  "handover.completed": "Handover completed",
  "handover.issues_outstanding": "Handover issues recorded",
  "handover.updated": "Handover updated",
  "payment_plan.activated": "Payment plan activated",
  "payment_plan.completed": "Payment plan completed",
  "payment_plan.cancelled": "Payment plan cancelled",
  "payment_milestone.created": "Payment milestone created",
  "payment_milestone.updated": "Payment milestone updated",
  "payment_milestone.cancelled": "Payment milestone cancelled",
  "payment_milestone.paid": "Milestone fully paid",
  "payment.received": "Payment received",
  "payment.partial_received": "Partial payment received",
  "payment.proof_uploaded": "Payment proof uploaded",
  "payment.voided": "Receipt voided",
};
export function projectActivityLabel(event: string, metadata: Record<string, unknown>) {
  const base = activityLabels[event] || event.replaceAll(".", " ").replace(/^./, (letter) => letter.toUpperCase());
  if (typeof metadata.stage === "string") return `${base} · ${metadata.stage}`;
  if (typeof metadata.title === "string") return `${base} · ${metadata.title}`;
  if (typeof metadata.file_name === "string") return `${base} · ${metadata.file_name}`;
  if (typeof metadata.receipt_number === "string") return `${base} · ${metadata.receipt_number}`;
  if (typeof metadata.milestone === "string") return `${base} · ${metadata.milestone}`;
  return base;
}
