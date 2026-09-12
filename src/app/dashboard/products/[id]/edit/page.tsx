import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/dashboard/product-form";
import { ProductMedia } from "@/components/dashboard/product-media";
import { PageHeading } from "@/components/ui/page-heading";
import { requireManagement } from "@/lib/auth/dal";
import { getAdminProduct, getCategoryOptions } from "@/lib/catalogue/admin-queries";

export default async function EditProductPage({ params }: PageProps<"/dashboard/products/[id]/edit">) {
  await requireManagement();
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(id), getCategoryOptions()]);
  if (!product) notFound();
  return <div className="mx-auto max-w-5xl space-y-6"><Link href="/dashboard/products" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to products</Link><PageHeading title={product.name} description="Edit product content, publication, pricing, specifications, and media." action={product.is_published && !product.archived_at ? <Link href={`/products/${product.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium">View public page <ExternalLink size={15} /></Link> : undefined} /><ProductForm product={product} categories={categories} /><ProductMedia productId={product.id} images={product.images} /></div>;
}
