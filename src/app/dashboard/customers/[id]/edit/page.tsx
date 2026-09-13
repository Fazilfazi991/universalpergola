import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { PageHeading } from "@/components/ui/page-heading";
import { requireRole } from "@/lib/auth/dal";
import { getCustomer, getStaffDirectory } from "@/lib/crm/queries";

export default async function EditCustomerPage({ params }: PageProps<"/dashboard/customers/[id]/edit">) {
  const { id } = await params;
  const [profile, customer, staff] = await Promise.all([requireRole(["admin", "sales"]), getCustomer(id), getStaffDirectory()]);
  if (!customer) notFound();
  return <div className="mx-auto max-w-4xl space-y-6"><Link href={`/dashboard/customers/${id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to customer</Link><PageHeading title={`Edit ${customer.name}`} description="Keep contact, location, source, and internal context current." /><CustomerForm customer={customer} staff={staff} role={profile.role} /></div>;
}
