import type { QUOTATION_STATUSES } from "./constants.ts";

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];
export type DiscountType = "fixed" | "percentage";

export type QuotationItemInput = {
  product_id: string | null;
  source_measurement_id: string | null;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  width: string;
  height: string;
  length: string;
  dimensions_details: string;
  unit_price: string;
  discount_amount: string;
  taxable: boolean;
  sort_order: number;
};

export type QuotationActionState = { ok: boolean; message: string };

export type QuotationProductOption = {
  id: string;
  name: string;
  product_code: string | null;
  short_description: string | null;
  full_description: string | null;
  pricing_mode: string;
  price: number | null;
};

export type QuotationMeasurementOption = {
  id: string;
  site_visit_id: string;
  label: string;
  width: number | null;
  height: number | null;
  length: number | null;
  unit: string;
  quantity: number;
  notes: string | null;
};
