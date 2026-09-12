import type { PricingMode } from "@/lib/catalogue/types";

const aed = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2,
});

export function presentPrice(mode: PricingMode, price: number | null) {
  if (mode === "hidden") return null;
  if (mode === "price_on_request") return "Price on request";
  if (price === null) return null;
  const formatted = aed.format(price);
  return mode === "starting_price" ? `From ${formatted}` : formatted;
}
