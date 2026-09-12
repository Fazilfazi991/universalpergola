import { z } from "zod";

export const PRICING_MODES = [
  "hidden",
  "price_on_request",
  "starting_price",
  "fixed_price",
] as const;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

const slug = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(96, "Use 96 characters or fewer.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens only.");

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum, `Use ${maximum} characters or fewer.`);

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(120),
  slug,
  description: optionalText(320),
  long_description: optionalText(6000),
  image_alt_text: optionalText(180),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(-10000).max(10000),
  seo_title: optionalText(70),
  seo_description: optionalText(180),
});

const specificationRecord = z
  .string()
  .max(20000)
  .transform((value, context): Record<string, string> => {
    try {
      const parsed = JSON.parse(value || "{}") as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length > 30) {
        context.addIssue({ code: "custom", message: "Use no more than 30 specification rows." });
        return {};
      }
      const clean: Record<string, string> = {};
      for (const [rawKey, rawValue] of entries) {
        const key = rawKey.trim();
        const valueText = String(rawValue ?? "").trim();
        if (!key || !valueText) continue;
        if (key.length > 80 || valueText.length > 300) {
          context.addIssue({ code: "custom", message: "Specification labels must be under 80 characters and values under 300." });
          return {};
        }
        clean[key] = valueText;
      }
      return clean;
    } catch {
      context.addIssue({ code: "custom", message: "Specifications could not be read." });
      return {};
    }
  });

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a product name.").max(160),
    slug,
    product_code: optionalText(80),
    category_id: z.string().uuid("Choose a category."),
    short_description: optionalText(360),
    full_description: optionalText(12000),
    material: optionalText(500),
    colour_information: optionalText(1000),
    dimensions_information: optionalText(1000),
    specifications: specificationRecord,
    pricing_mode: z.enum(PRICING_MODES),
    price: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().min(0, "Price cannot be negative.").max(999999999999).optional(),
    ),
    is_featured: z.boolean(),
    is_published: z.boolean(),
    sort_order: z.coerce.number().int().min(-10000).max(10000),
    seo_title: optionalText(70),
    seo_description: optionalText(180),
  })
  .superRefine((value, context) => {
    if (["starting_price", "fixed_price"].includes(value.pricing_mode) && value.price === undefined) {
      context.addIssue({ code: "custom", path: ["price"], message: "Enter a price for this pricing mode." });
    }
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
