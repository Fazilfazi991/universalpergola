export const PAYMENT_PROOF_BUCKET = "payment-proofs";
export const PAYMENT_PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;
const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function createPaymentProofPath(paymentId: string, proofId: string, mime: string) {
  return `${paymentId}/${proofId}.${extensions[mime] || "invalid"}`;
}
export function validatePaymentProof(file: { type: string; size: number }) {
  if (!PAYMENT_PROOF_TYPES.includes(file.type as (typeof PAYMENT_PROOF_TYPES)[number])) return "Use PDF, JPEG, PNG, or WebP.";
  if (file.size < 1 || file.size > PAYMENT_PROOF_MAX_BYTES) return "Proof files must be no larger than 10 MB.";
  return "";
}
