import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";

export function DemoDisabledNotice({ children = "This action is disabled in the public demo." }: { children?: ReactNode }) {
  return <p className="flex items-center gap-2 rounded-md border border-line bg-limestone px-3 py-2 text-xs text-stone"><LockKeyhole size={14} className="shrink-0 text-brass-dark" />{children}</p>;
}
