"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { isDemoMode } from "@/lib/demo-mode";
import type { Database } from "@/lib/supabase/database.generated";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient() {
  if (isDemoMode()) return null;
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Add the public project settings to .env.local.");
  }

  browserClient ??= createBrowserClient<Database>(config.url, config.publishableKey);
  return browserClient;
}
