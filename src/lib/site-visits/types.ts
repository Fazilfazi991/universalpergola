import type { Database } from "@/lib/supabase/database.generated";

export type SiteVisitStatus = Database["public"]["Enums"]["site_visit_status"];
export type SiteVisitActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]>; recordId?: string };
export const INITIAL_SITE_VISIT_ACTION_STATE: SiteVisitActionState = { status: "idle" };

export type VisitStaff = { id: string; full_name: string; role: Database["public"]["Enums"]["app_role"] };
export type VisitCustomerOption = { id: string; name: string; phone: string | null; whatsapp_number: string | null; address: string | null; area: string | null; emirate: string | null };
export type VisitEnquiryOption = { id: string; enquiry_number: number; customer_id: string | null; subject: string | null; product: { name: string } | null };
