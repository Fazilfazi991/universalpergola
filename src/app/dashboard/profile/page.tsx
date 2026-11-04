import type { Metadata } from "next";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentProfile } from "@/lib/auth/dal";
import { roleLabels } from "@/lib/auth/permissions";
import { ProfileForms } from "@/components/dashboard/profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await requireCurrentProfile();
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeading title="Profile" description="Manage your display name, username, and password." />
      <ProfileForms profile={{ fullName: profile.fullName, username: profile.username, email: profile.email, role: roleLabels[profile.role] }} />
    </div>
  );
}
