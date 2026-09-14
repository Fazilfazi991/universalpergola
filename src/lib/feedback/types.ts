import type { Database } from "@/lib/supabase/database.generated";

export type FeedbackStatus = Database["public"]["Enums"]["feedback_status"];

export type FeedbackActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_FEEDBACK_ACTION_STATE: FeedbackActionState = { status: "idle" };
