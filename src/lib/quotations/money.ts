import type { DiscountType, QuotationItemInput } from "./types.ts";

function decimalToScaled(value: string | number, scale: number) {
  const normalized = String(value ?? "0").trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return BigInt(0);
  const [whole, fraction = ""] = normalized.split(".");
  const digits = Math.log10(scale);
  const padded = `${fraction}${"0".repeat(digits + 1)}`;
  const base =
    BigInt(whole) * BigInt(scale) + BigInt(padded.slice(0, digits) || "0");
  return Number(padded[digits] || "0") >= 5 ? base + BigInt(1) : base;
}

function roundDivide(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / BigInt(2)) / denominator;
}

export function quotationPreviewTotals(
  items: readonly QuotationItemInput[],
  discountType: DiscountType,
  discountValue: string,
  vatRate: string,
) {
  let subtotal = BigInt(0);
  let taxableSubtotal = BigInt(0);
  const lines = items.map((item) => {
    const quantity = decimalToScaled(item.quantity, 1000);
    const unitPrice = decimalToScaled(item.unit_price, 100);
    const lineDiscount = decimalToScaled(item.discount_amount, 100);
    const gross = roundDivide(quantity * unitPrice, BigInt(1000));
    const total = gross > lineDiscount ? gross - lineDiscount : BigInt(0);
    subtotal += total;
    if (item.taxable) taxableSubtotal += total;
    return Number(total) / 100;
  });
  const discountInput = decimalToScaled(
    discountValue,
    discountType === "percentage" ? 10000 : 100,
  );
  const requestedDiscount =
    discountType === "percentage"
      ? roundDivide(subtotal * discountInput, BigInt(100) * BigInt(10000))
      : discountInput;
  const discount = requestedDiscount > subtotal ? subtotal : requestedDiscount;
  const taxableDiscount =
    subtotal > BigInt(0)
      ? roundDivide(discount * taxableSubtotal, subtotal)
      : BigInt(0);
  const vatInput = decimalToScaled(vatRate, 10000);
  const vat = roundDivide(
    (taxableSubtotal - taxableDiscount) * vatInput,
    BigInt(100) * BigInt(10000),
  );
  return {
    lines,
    subtotal: Number(subtotal) / 100,
    discount: Number(discount) / 100,
    vat: Number(vat) / 100,
    total: Number(subtotal - discount + vat) / 100,
  };
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "AED",
) {
  const amount = typeof value === "string" ? Number(value) : value || 0;
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
