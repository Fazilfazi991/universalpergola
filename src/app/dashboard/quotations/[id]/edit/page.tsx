import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { QuotationBuilder } from "@/components/dashboard/quotation-builder";
import { PageHeading } from "@/components/ui/page-heading";
import { requireRole } from "@/lib/auth/dal";
import type { QuotationBuilderInitial } from "@/lib/quotations/defaults";
import {
  getQuotation,
  getQuotationCreationOptions,
  getQuotationWorkspace,
} from "@/lib/quotations/queries";

export default async function EditQuotationPage({
  params,
}: PageProps<"/dashboard/quotations/[id]/edit">) {
  const { id } = await params;
  const [profile, quote, options] = await Promise.all([
    requireRole(["admin", "sales"]),
    getQuotation(id),
    getQuotationCreationOptions(),
  ]);
  if (!quote) notFound();
  if (!(["draft", "ready"] as string[]).includes(quote.status))
    redirect(`/dashboard/quotations/${id}?error=revision-required`);
  const { items } = await getQuotationWorkspace(quote);
  const initial: QuotationBuilderInitial = {
    id: quote.id,
    customer_id: quote.customer_id,
    enquiry_id: quote.enquiry_id || "",
    site_visit_id: quote.site_visit_id || "",
    owner_id: quote.owner_id || profile.id,
    currency: quote.currency,
    issue_date: quote.issue_date,
    validity_date: quote.validity_date || quote.issue_date,
    customer_name_snapshot: quote.customer_name_snapshot,
    customer_company_snapshot: quote.customer_company_snapshot || "",
    customer_phone_snapshot: quote.customer_phone_snapshot || "",
    customer_email_snapshot: quote.customer_email_snapshot || "",
    site_address_snapshot: quote.site_address_snapshot || "",
    introduction: quote.introduction || "",
    internal_notes: quote.internal_notes || "",
    customer_notes: quote.customer_notes || "",
    terms: quote.terms || "",
    discount_type: quote.discount_type,
    discount_value: String(quote.discount_value),
    vat_rate: String(quote.vat_rate),
    items: items.map((item) => ({
      product_id: item.product_id,
      source_measurement_id: item.source_measurement_id,
      item_name: item.item_name,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      width: item.width === null ? "" : String(item.width),
      height: item.height === null ? "" : String(item.height),
      length: item.length === null ? "" : String(item.length),
      dimensions_details: item.dimensions_details || "",
      unit_price: String(item.unit_price),
      discount_amount: String(item.discount_amount),
      taxable: item.taxable,
      sort_order: item.sort_order,
    })),
  };
  return (
    <div className="space-y-7">
      <Link
        href={`/dashboard/quotations/${id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"
      >
        <ArrowLeft size={16} />
        Back to quotation
      </Link>
      <PageHeading
        title={`Edit ${quote.quotation_number}`}
        description={`Revision ${quote.revision_number} · ${quote.status === "ready" ? "Ready for review" : "Draft"}`}
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
