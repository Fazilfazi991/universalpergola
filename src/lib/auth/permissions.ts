export const APP_ROLES = ["admin", "sales", "site_team", "accounts"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type DashboardModule =
  | "products"
  | "categories"
  | "enquiries"
  | "customers"
  | "site-visits"
  | "quotations"
  | "projects"
  | "payments"
  | "tasks"
  | "feedback"
  | "reports"
  | "users"
  | "settings";

const permissions: Record<AppRole, readonly DashboardModule[]> = {
  admin: [
    "products", "categories", "enquiries", "customers", "site-visits",
    "quotations", "projects", "payments", "tasks", "feedback", "reports",
    "users", "settings",
  ],
  sales: [
    "products", "categories", "enquiries", "customers", "site-visits",
    "quotations", "projects", "tasks", "feedback",
  ],
  site_team: ["site-visits", "projects", "tasks", "feedback"],
  accounts: ["customers", "quotations", "projects", "payments", "tasks"],
};

export function canAccessModule(role: AppRole, module: DashboardModule) {
  return permissions[role].includes(module);
}

export const roleLabels: Record<AppRole, string> = {
  admin: "Admin / Management",
  sales: "Sales",
  site_team: "Site Team",
  accounts: "Accounts",
};
