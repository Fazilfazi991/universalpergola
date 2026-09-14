"use server";

import { createClient } from "@/lib/supabase/server";
import { publicFeedbackSchema } from "@/lib/feedback/validation";
import type { FeedbackActionState } from "@/lib/feedback/types";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}
export async function submitPublicFeedbackAction(
  _state: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsed = publicFeedbackSchema.safeParse({
    token: value(formData, "token"), rating: value(formData, "rating"),
    comment: value(formData, "comment"), permission: formData.get("permission") === "on",
    website: value(formData, "website"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message || "Check your feedback and try again." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Feedback is temporarily unavailable." };
  const { data, error } = await supabase.rpc("submit_public_feedback", {
    p_token: parsed.data.token, p_rating: parsed.data.rating, p_comment: parsed.data.comment,
    p_permission: parsed.data.permission, p_honeypot: parsed.data.website,
  });
  if (error) return { status: "error", message: "This feedback link is invalid, expired, or already closed." };
  return { status: "success", message: data === "already_submitted" ? "Feedback was already received." : "Feedback received." };
}
