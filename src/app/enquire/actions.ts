"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.generated";
import { publicEnquirySchema } from "@/lib/crm/validation";
import { enquiryReference } from "@/lib/crm/presentation";
import type { CrmActionState } from "@/lib/crm/types";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}
export async function submitPublicEnquiryAction(_state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  const parsed = publicEnquirySchema.safeParse({
    name: value(formData, "name"), phone: value(formData, "phone"),
    whatsapp_number: value(formData, "whatsapp_number"), email: value(formData, "email"),
    emirate: value(formData, "emirate"), message: value(formData, "message"),
    product_id: value(formData, "product_id"), product_slug: value(formData, "product_slug"),
    website: value(formData, "website"),
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const config = getSupabasePublicConfig();
  if (!config) return { status: "error", message: "Enquiries are temporarily unavailable. Please call us instead." };
  const supabase = createSupabaseClient<Database>(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("submit_public_enquiry", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_message: parsed.data.message,
    p_whatsapp_number: parsed.data.whatsapp_number || undefined,
    p_email: parsed.data.email || undefined,
    p_emirate: parsed.data.emirate || undefined,
    p_product_id: parsed.data.product_id || undefined,
    p_honeypot: parsed.data.website || undefined,
  });
  if (error) {
    const safeMessage = ["Enter your name", "Enter a valid phone number", "Tell us briefly what you need", "Enter a valid email address", "The selected product is no longer available", "Please wait before sending another enquiry"].find((message) => error.message.includes(message));
    return { status: "error", message: safeMessage || "The enquiry could not be sent. Check the details and try again." };
  }
  const created = data?.[0];
  if (!created) return { status: "error", message: "The enquiry could not be confirmed. Please call us instead." };
  return { status: "success", message: "Your enquiry is with our team. We’ll contact you shortly.", reference: enquiryReference(created.enquiry_number) };
}
