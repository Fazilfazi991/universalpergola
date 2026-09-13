import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EnquiryForm } from "@/components/dashboard/enquiry-form";
import { PageHeading } from "@/components/ui/page-heading";
import { requireRole } from "@/lib/auth/dal";
import { getCrmProductOptions, getCustomerOptions, getStaffDirectory } from "@/lib/crm/queries";

export default async function NewEnquiryPage({ searchParams }: PageProps<"/dashboard/enquiries/new">) {
  const [profile, params, customers, products, staff] = await Promise.all([requireRole(["admin", "sales"]), searchParams, getCustomerOptions(), getCrmProductOptions(), getStaffDirectory()]);
  const initialCustomerId = typeof params.customer === "string" && customers.some((item) => item.id === params.customer) ? params.customer : "";
  return <div className="mx-auto max-w-5xl space-y-6"><Link href="/dashboard/enquiries" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to enquiries</Link><PageHeading title="New enquiry" description="Capture a phone, WhatsApp, walk-in, referral, or returning-customer opportunity." /><EnquiryForm customers={customers} products={products} staff={staff} role={profile.role} currentUserId={profile.id} initialCustomerId={initialCustomerId} /></div>;
}
