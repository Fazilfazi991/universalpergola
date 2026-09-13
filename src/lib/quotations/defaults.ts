import { DEFAULT_QUOTATION_TERMS } from "./constants.ts";
import type { DiscountType, QuotationItemInput } from "./types.ts";

export type QuotationBuilderInitial = {
  id?: string;
  customer_id: string;
  enquiry_id: string;
  site_visit_id: string;
  owner_id: string;
  currency: string;
  issue_date: string;
  validity_date: string;
  customer_name_snapshot: string;
  customer_company_snapshot: string;
  customer_phone_snapshot: string;
  customer_email_snapshot: string;
  site_address_snapshot: string;
  introduction: string;
  internal_notes: string;
  customer_notes: string;
  terms: string;
  discount_type: DiscountType;
  discount_value: string;
  vat_rate: string;
  items: QuotationItemInput[];
};

function nextDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultQuotationInitial(): QuotationBuilderInitial {
  return {
    customer_id: "",
    enquiry_id: "",
    site_visit_id: "",
    owner_id: "",
    currency: "AED",
    issue_date: new Date().toISOString().slice(0, 10),
    validity_date: nextDate(30),
    customer_name_snapshot: "",
    customer_company_snapshot: "",
    customer_phone_snapshot: "",
    customer_email_snapshot: "",
    site_address_snapshot: "",
    introduction: "",
    internal_notes: "",
    customer_notes: "",
    terms: DEFAULT_QUOTATION_TERMS,
    discount_type: "fixed",
    discount_value: "0",
    vat_rate: "5",
    items: [
      {
        product_id: null,
        source_measurement_id: null,
        item_name: "",
        description: "",
        quantity: "1",
        unit: "item",
        width: "",
        height: "",
        length: "",
        dimensions_details: "",
        unit_price: "0",
        discount_amount: "0",
        taxable: true,
        sort_order: 10,
      },
    ],
  };
}
