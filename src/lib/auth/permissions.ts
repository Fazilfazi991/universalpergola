export const APP_ROLES = ["admin", "sales", "site_team", "accounts"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type DashboardModule =
  | "products"
  | "categories"
  | "enquiries"
  | "customers"
  | "site-visits"
  | "quotations"
  | "documents"
  | "invoices"
  | "projects"
  | "payments"
  | "tasks"
  | "feedback"
  | "reports"
  | "accounts"
  | "users"
  | "settings";

const permissions: Record<AppRole, readonly DashboardModule[]> = {
  admin: [
    "products", "categories", "enquiries", "customers", "site-visits",
    "quotations", "documents", "invoices", "projects", "payments", "tasks", "feedback", "reports",
    "users", "settings",
    "accounts",
  ],
  sales: [
    "products", "categories", "enquiries", "customers", "site-visits",
    "quotations", "projects", "tasks", "feedback",
  ],
  site_team: ["site-visits", "projects", "tasks"],
  accounts: ["customers", "quotations", "documents", "invoices", "projects", "payments", "tasks", "accounts"],
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
