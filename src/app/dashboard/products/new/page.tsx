import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/dashboard/product-form";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireManagement } from "@/lib/auth/dal";
import { getCategoryOptions } from "@/lib/catalogue/admin-queries";

export default async function NewProductPage() {
  await requireManagement();
  const categories = await getCategoryOptions();
  return <div className="mx-auto max-w-5xl space-y-6"><Link href="/dashboard/products" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to products</Link><PageHeading title="New product" description="Create a catalogue record, then add its cover and gallery images." />{categories.length === 0 && <StatusNotice title="Create a category first"><p>Products require a category. Add at least one category before saving this form.</p></StatusNotice>}<ProductForm categories={categories} /></div>;
}
