import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { PageHeading } from "@/components/ui/page-heading";
import { requireRole } from "@/lib/auth/dal";
import { getStaffDirectory } from "@/lib/crm/queries";

export default async function NewCustomerPage() {
  const [profile, staff] = await Promise.all([requireRole(["admin", "sales"]), getStaffDirectory()]);
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/dashboard/customers" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to customers</Link><PageHeading title="New customer" description="Create the central contact record before adding further opportunities." /><CustomerForm staff={staff} role={profile.role} /></div>;
}
