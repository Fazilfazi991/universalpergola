"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginState = {
  message?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  if (!supabase) return { message: "Supabase is not configured. Add the project URL and publishable key to .env.local." };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: error.message === "Invalid login credentials" ? "Email or password is incorrect." : "Sign in could not be completed. Try again." };

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
