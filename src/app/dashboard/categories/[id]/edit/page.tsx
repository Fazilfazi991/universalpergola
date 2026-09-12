import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/dashboard/category-form";
import { CategoryMedia } from "@/components/dashboard/category-media";
import { PageHeading } from "@/components/ui/page-heading";
import { requireManagement } from "@/lib/auth/dal";
import { getAdminCategory } from "@/lib/catalogue/admin-queries";

export default async function EditCategoryPage({ params }: PageProps<"/dashboard/categories/[id]/edit">) {
  await requireManagement();
  const { id } = await params;
  const category = await getAdminCategory(id);
  if (!category) notFound();
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/dashboard/categories" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to categories</Link><PageHeading title={category.name} description="Edit category content, catalogue visibility, media, and search metadata." /><CategoryForm category={category} /><CategoryMedia category={category} /></div>;
}
