import type { Database, Json } from "@/lib/supabase/database.generated";
import type { ActionState } from "@/lib/forms/action-state";

export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
export type InvoiceActionState = ActionState;

export type InvoiceLineInput = {
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  taxable: boolean;
  sort_order: number;
};

export type InvoiceDraftPayload = {
  issue_date: string;
  due_date: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  vat_rate: number;
  notes: string;
  terms: string;
  items: InvoiceLineInput[];
};

export function invoicePayloadJson(payload: InvoiceDraftPayload): Json {
  return payload as unknown as Json;
}

export const INITIAL_INVOICE_ACTION_STATE: InvoiceActionState = {
  status: "idle",
};
