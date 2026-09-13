import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuotationBuilder } from "@/components/dashboard/quotation-builder";
import { PageHeading } from "@/components/ui/page-heading";
import { requireRole } from "@/lib/auth/dal";
import { defaultQuotationInitial } from "@/lib/quotations/defaults";
import { getQuotationCreationOptions } from "@/lib/quotations/queries";

export default async function NewQuotationPage({
  searchParams,
}: PageProps<"/dashboard/quotations/new">) {
  const [profile, params, options] = await Promise.all([
    requireRole(["admin", "sales"]),
    searchParams,
    getQuotationCreationOptions(),
  ]);
  const initial = defaultQuotationInitial();
  const visit =
    typeof params.visit === "string"
      ? options.visits.find((item) => item.id === params.visit)
      : undefined;
  const enquiryId =
    visit?.enquiry_id ||
    (typeof params.enquiry === "string" ? params.enquiry : "");
  const enquiry = options.enquiries.find((item) => item.id === enquiryId);
  const customerId =
    visit?.customer_id ||
    enquiry?.customer_id ||
    (typeof params.customer === "string" ? params.customer : "") ||
    "";
  const customer = options.customers.find((item) => item.id === customerId);
  initial.customer_id = customer?.id || "";
  initial.enquiry_id = enquiry?.id || "";
  initial.site_visit_id = visit?.id || "";
  initial.owner_id =
    profile.role === "sales" ? profile.id : enquiry?.assigned_to || profile.id;
  initial.customer_name_snapshot = customer?.name || "";
  initial.customer_company_snapshot = customer?.company_name || "";
  initial.customer_phone_snapshot = customer?.phone || "";
  initial.customer_email_snapshot = customer?.email || "";
  initial.site_address_snapshot =
    visit?.site_address ||
    [customer?.address, customer?.area, customer?.emirate]
      .filter(Boolean)
      .join(", ");
  initial.introduction = visit?.measurement_summary || enquiry?.subject || "";
  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/quotations"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"
      >
        <ArrowLeft size={16} />
        Back to quotations
      </Link>
      <PageHeading
        title="New quotation"
        description="Build a commercial snapshot from catalogue products, custom work, and site measurements."
      />
      <QuotationBuilder
        initial={initial}
        role={profile.role === "admin" ? "admin" : "sales"}
        currentUserId={profile.id}
        options={options}
      />
    </div>
  );
}
