import type { AppRole } from "@/lib/auth/permissions";
import type { ENQUIRY_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export type StaffSummary = { id: string; full_name: string; role: AppRole };

export type DuplicateCandidate = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  company_name: string | null;
};

export type CrmActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  duplicates?: DuplicateCandidate[];
  reference?: string;
};

export const INITIAL_CRM_ACTION_STATE: CrmActionState = { status: "idle" };
