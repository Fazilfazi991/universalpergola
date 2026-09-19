import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? "Universal Pergola Demo | Fusion Ventures" : "Universal Pergola",
    template: "%s | Universal Pergola",
  },
  description: "Architectural outdoor systems and internal project operations.",
  robots: process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
