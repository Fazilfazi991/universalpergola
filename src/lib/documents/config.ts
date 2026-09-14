export const UNIVERSAL_PERGOLA_DOCUMENT = {
  tradeName: "Universal Pergola",
  legalName: "Universal Pergola Aluminium Glass Work SPS (LLC)",
  address: "Shop No. 06, Ajman - Jurf - Opposite Big Bazar",
  website: "www.universalpergola.com",
  email: "pergola4uae@yahoo.com",
  phones: ["+971 54 1789 866", "+971 56 161 1911"],
  instagram: "@universalpergola",
  signatoryName: "Eltho Joseph Alexander",
  signatoryTitle: "Manager / Designer",
  tagline: "Where vision meets value",
  footerLine: "Rome was not built in a day, neither are great designs.",
} as const;

export const DEFAULT_QUOTATION_PAYMENT_TERMS = [
  { label: "Advance payment", percentage: 50 },
  { label: "Second payment", percentage: 40 },
  { label: "Final payment", percentage: 10 },
] as const;

export const DEFAULT_QUOTATION_TERMS = [
  "1. Advance Payment: 50%.",
  "2. Second Payment: 40%.",
  "3. Final Payment: 10%.",
  "4. Changes to dimensions, finish, or models will result in different pricing.",
  "5. The company reserves the right to take photographs after installation.",
  "6. 3D designs are provided for reference only.",
  "7. Advance payments are non-refundable.",
  "8. If the work is not awarded, design charges are payable by the customer.",
  "9. This offer is valid for 7 days only.",
  "10. Current market conditions may affect and be reflected in this quotation.",
].join("\n");
