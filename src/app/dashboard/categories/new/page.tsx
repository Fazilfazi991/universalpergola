import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryForm } from "@/components/dashboard/category-form";
import { PageHeading } from "@/components/ui/page-heading";
import { requireManagement } from "@/lib/auth/dal";

export default async function NewCategoryPage() {
  await requireManagement();
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/dashboard/categories" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to categories</Link><PageHeading title="New category" description="Create a flexible catalogue category without hardcoding the final product structure." /><CategoryForm /></div>;
}
