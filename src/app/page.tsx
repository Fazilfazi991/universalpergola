import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { reason } = await searchParams;

  return <LoginScreen reason={reason} />;
}
