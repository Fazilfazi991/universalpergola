"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a display name.").max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,31}$/, "Use 3–32 letters, numbers, or underscores; start with a letter."),
});

export type ProfileState = { status?: "success" | "error"; message?: string; fieldErrors?: { fullName?: string[]; username?: string[] } };

export async function updateProfileAction(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const profile = await requireCurrentProfile();
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName"), username: formData.get("username") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Profile is temporarily unavailable." };
  const { error } = await supabase.from("profiles")
    .update({ full_name: parsed.data.fullName, username: parsed.data.username })
    .eq("id", profile.id);
  if (error?.code === "23505") return { status: "error", fieldErrors: { username: ["That username is already in use."] } };
  if (error) return { status: "error", message: "Profile could not be updated. Try again." };
  revalidatePath("/dashboard", "layout");
  return { status: "success", message: "Profile saved. Your new username works at your next sign in." };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(12, "Use at least 12 characters."),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

export type PasswordState = { status?: "error"; message?: string; fieldErrors?: { currentPassword?: string[]; newPassword?: string[]; confirmPassword?: string[] } };

export async function changePasswordAction(_: PasswordState, formData: FormData): Promise<PasswordState> {
  await requireCurrentProfile();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Password change is temporarily unavailable." };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) return { status: "error", message: "Please sign in again." };
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) return { status: "error", fieldErrors: { currentPassword: ["Current password is incorrect."] } };
  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (updateError) return { status: "error", message: "Password could not be changed. Try again." };
  await supabase.auth.signOut({ scope: "global" });
  redirect("/?reason=password-changed");
}
