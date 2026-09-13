import type { Database } from "@/lib/supabase/database.generated";

export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type ProjectPriority = Database["public"]["Enums"]["project_priority"];
export type StageStatus = Database["public"]["Enums"]["stage_status"];
export type HandoverStatus = Database["public"]["Enums"]["handover_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type ProjectAssignmentRole =
  | "project_owner"
  | "sales"
  | "site_team"
  | "installer"
  | "team_member";
export type ProjectUpdateType =
  | "general"
  | "progress"
  | "issue"
  | "delay"
  | "customer_decision"
  | "technical_note";
export type ProjectActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  recordId?: string;
  storagePath?: string;
};
export const INITIAL_PROJECT_ACTION_STATE: ProjectActionState = { status: "idle" };
