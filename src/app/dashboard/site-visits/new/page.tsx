import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteVisitForm } from "@/components/dashboard/site-visit-form";
import { PageHeading } from "@/components/ui/page-heading";
import { requireRole } from "@/lib/auth/dal";
import { getSiteVisitCreationOptions } from "@/lib/site-visits/queries";

export default async function NewSiteVisitPage({ searchParams }: PageProps<"/dashboard/site-visits/new">) {
  const [profile, options, query] = await Promise.all([requireRole(["admin", "sales"]), getSiteVisitCreationOptions(), searchParams]);
  return <div className="mx-auto max-w-4xl space-y-7"><Link href="/dashboard/site-visits" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to site visits</Link><PageHeading title="Schedule site visit" description={profile.role === "sales" ? "Create an unassigned request for Management to allocate to the Site Team." : "Link the visit to a customer and optionally to an enquiry."} /><section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6"><SiteVisitForm customers={options.customers} enquiries={options.enquiries} siteStaff={options.siteStaff} role={profile.role} initialCustomerId={typeof query.customer === "string" ? query.customer : ""} initialEnquiryId={typeof query.enquiry === "string" ? query.enquiry : ""} /></section></div>;
}
