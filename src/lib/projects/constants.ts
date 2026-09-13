import type {
  HandoverStatus,
  ProjectAssignmentRole,
  ProjectPriority,
  ProjectStatus,
  ProjectUpdateType,
  StageStatus,
} from "./types";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const PROJECT_PRIORITIES: ProjectPriority[] = ["low", "normal", "high", "urgent"];
export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  not_started: "Pending",
  in_progress: "In progress",
  blocked: "Blocked",
  skipped: "Skipped",
  completed: "Completed",
};
export const HANDOVER_STATUSES: HandoverStatus[] = [
  "pending",
  "ready",
  "issues_outstanding",
  "completed",
];
export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  completed: "Completed",
  issues_outstanding: "Issues outstanding",
};
export const PROJECT_ASSIGNMENT_ROLES: ProjectAssignmentRole[] = [
  "project_owner",
  "sales",
  "site_team",
  "installer",
  "team_member",
];
export const PROJECT_ASSIGNMENT_LABELS: Record<ProjectAssignmentRole, string> = {
  project_owner: "Project owner",
  sales: "Sales",
  site_team: "Site Team",
  installer: "Installer / execution",
  team_member: "Other team member",
};
export const PROJECT_UPDATE_TYPES: ProjectUpdateType[] = [
  "general",
  "progress",
  "issue",
  "delay",
  "customer_decision",
  "technical_note",
];
export const PROJECT_UPDATE_LABELS: Record<ProjectUpdateType, string> = {
  general: "General update",
  progress: "Progress",
  issue: "Issue",
  delay: "Delay",
  customer_decision: "Customer decision",
  technical_note: "Technical note",
};
export const PROJECT_FILE_CATEGORIES = [
  "drawing",
  "approval",
  "manufacturing",
  "installation",
  "completion",
  "handover",
  "other",
] as const;
export const PROJECT_FILE_CATEGORY_LABELS = {
  drawing: "Drawing",
  approval: "Approval",
  manufacturing: "Manufacturing",
  installation: "Installation",
  completion: "Completion",
  handover: "Handover",
  other: "Other",
} as const;
