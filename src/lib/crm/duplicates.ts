import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DuplicateCandidate } from "@/lib/crm/types";
import { normalizePhone } from "@/lib/crm/validation";

export async function findCustomerDuplicates(phone: string, whatsapp: string, email: string, excludeId?: string) {
  const supabase = await createClient();
  if (!supabase) return [] as DuplicateCandidate[];

  const clauses: string[] = [];
  const phoneKey = normalizePhone(phone);
  const whatsappKey = normalizePhone(whatsapp);
  const emailKey = email.trim().toLowerCase();
  if (phoneKey) clauses.push(`phone_normalized.eq.${phoneKey}`);
  if (whatsappKey) clauses.push(`whatsapp_normalized.eq.${whatsappKey}`);
  if (emailKey) clauses.push(`email_normalized.eq.${emailKey.replace(/[,()]/g, "")}`);
  if (!clauses.length) return [];

  let query = supabase
    .from("customers")
    .select("id, name, phone, whatsapp_number, email, company_name")
    .or(clauses.join(","))
    .is("archived_at", null)
    .limit(5);
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw new Error("Unable to check for matching customers.");
  return (data || []) as DuplicateCandidate[];
}
