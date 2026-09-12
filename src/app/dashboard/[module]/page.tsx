import { Construction } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import type { DashboardModule } from "@/lib/auth/permissions";

const modules: Record<DashboardModule, { title: string; description: string; empty: string }> = {
  products: { title: "Products", description: "Manage catalogue content, publication, specifications, images, and pricing visibility.", empty: "Product management arrives in Phase 2. The shared schema and published-only catalogue query are ready." },
  categories: { title: "Categories", description: "Organise the catalogue without hardcoding final product groups.", empty: "Category management arrives in Phase 2. No final categories have been invented or seeded." },
  enquiries: { title: "Enquiries", description: "Track catalogue enquiries, manual leads, ownership, priority, and follow-ups.", empty: "Enquiry workflows arrive in Phase 2. The lead lifecycle and activity tables are in place." },
  customers: { title: "Customers", description: "A single customer record for commercial and operational history.", empty: "Customer profiles and unified timelines arrive in Phase 2." },
  "site-visits": { title: "Site visits", description: "Schedule assigned visits and capture measurements, notes, and mobile photos.", empty: "Site visit operations arrive in Phase 2. Private photo storage policies are prepared." },
  quotations: { title: "Quotations", description: "Build structured, revision-ready quotations from products and custom line items.", empty: "Quotation creation and PDF output arrive in Phase 2." },
  projects: { title: "Projects", description: "Coordinate approved work through configurable delivery stages and handover.", empty: "Project workspaces arrive in Phase 2. Stage templates are configurable in the database." },
  payments: { title: "Payments", description: "Track milestones, receipts, balances, due dates, and proof documents.", empty: "Payment tracking arrives in Phase 2. No payment gateway has been introduced." },
  tasks: { title: "Tasks", description: "Drive daily work with assigned, prioritised, and linked actions.", empty: "Task boards and follow-up views arrive in Phase 2." },
  feedback: { title: "Feedback & handover", description: "Record completion, handover dates, customer ratings, and internal notes.", empty: "Completion and feedback workflows arrive in Phase 2." },
  reports: { title: "Reports", description: "Management reporting across pipeline, delivery, and financial status.", empty: "Reporting arrives after operational modules contain verified live data." },
  users: { title: "Users & roles", description: "Manage staff access for management, sales, site team, and accounts.", empty: "User administration arrives in Phase 2. Role enforcement is active in server checks and RLS." },
  settings: { title: "Settings", description: "Configure future workflow defaults and organisation preferences.", empty: "Settings screens arrive in Phase 2. Core stages remain database-configurable." },
};

function isDashboardModule(value: string): value is DashboardModule { return value in modules; }

export default async function ModulePage({ params }: PageProps<"/dashboard/[module]">) {
  const { module } = await params;
  if (!isDashboardModule(module)) notFound();
  await requireModuleAccess(module);
  const content = modules[module];
  return <div className="space-y-7"><PageHeading title={content.title} description={content.description} /><EmptyState icon={Construction} title="Foundation ready" description={content.empty} /></div>;
}
