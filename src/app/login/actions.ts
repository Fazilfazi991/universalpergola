"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/, "Enter a valid username."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginState = {
  message?: string;
  fieldErrors?: { username?: string[]; password?: string[] };
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  if (!supabase) return { message: "Supabase is not configured. Add the project URL and publishable key to .env.local." };

  const secret = process.env.SUPABASE_USERNAME_LOOKUP_SECRET;
  if (!secret) return { message: "Sign in is temporarily unavailable." };
  const requestHeaders = await headers();
  const address = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const ipHash = createHmac("sha256", secret).update(address).digest("hex");
  const { data: email, error: lookupError } = await supabase.rpc("resolve_login_username", {
    p_username: parsed.data.username.toLowerCase(),
    p_ip_hash: ipHash,
    p_secret: secret,
  });
  if (lookupError) return { message: "Sign in is temporarily unavailable. Try again later." };
  const { error } = await supabase.auth.signInWithPassword({
    email: email || "invalid-login@invalid.example",
    password: parsed.data.password,
  });
  if (error || !email) return { message: "Username or password is incorrect." };

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
