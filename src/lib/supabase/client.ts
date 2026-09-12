"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

let browserClient: SupabaseClient | undefined;

export function createClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Add the public project settings to .env.local.");
  }

  browserClient ??= createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
