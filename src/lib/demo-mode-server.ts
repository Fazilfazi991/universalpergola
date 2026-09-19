import "server-only";

import { isDemoMode } from "@/lib/demo-mode";

export { isDemoMode };

export const demoProfile = {
  id: "demo-profile-alex-morgan",
  fullName: "Alex Morgan",
  email: "alex.morgan@example.com",
  role: "admin" as const,
};
