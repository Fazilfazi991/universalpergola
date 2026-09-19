import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isDemoMode } from "@/lib/demo-mode";

export async function proxy(request: NextRequest) {
  if (isDemoMode()) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
