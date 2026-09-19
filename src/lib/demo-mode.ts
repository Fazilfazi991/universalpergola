export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export const demoNotice = "This action is disabled in the public demo.";
