import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoProfile, isDemoMode } from "@/lib/demo-mode-server";
import {
  APP_ROLES,
  canAccessModule,
  type AppRole,
  type DashboardModule,
} from "@/lib/auth/permissions";

export type CurrentProfile = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
};

export const requireCurrentProfile = cache(async (): Promise<CurrentProfile> => {
  if (isDemoMode()) return demoProfile;
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?reason=configuration");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", userData.user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !APP_ROLES.includes(profile.role as AppRole)
  ) {
    await supabase.auth.signOut();
    redirect("/login?reason=profile");
  }

  return {
    id: profile.id,
    fullName: profile.full_name || "Team member",
    email: profile.email || userData.user.email || "",
    role: profile.role as AppRole,
  };
});

export async function requireModuleAccess(module: DashboardModule) {
  const profile = await requireCurrentProfile();

  if (!canAccessModule(profile.role, module)) {
    redirect("/dashboard?notice=access-denied");
  }

  return profile;
}

export async function requireRole(allowedRoles: readonly AppRole[]) {
  const profile = await requireCurrentProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/dashboard?notice=access-denied");
  }

  return profile;
}

export function requireManagement() {
  return requireRole(["admin"]);
}
