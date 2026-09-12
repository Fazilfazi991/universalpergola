import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type StatusNoticeProps = { tone?: "info" | "success" | "error"; title: string; children: React.ReactNode };

export function StatusNotice({ tone = "info", title, children }: StatusNoticeProps) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;
  const tones = { info: "border-brass/35 bg-[#fbf7ef] text-brass-dark", success: "border-emerald-200 bg-emerald-50 text-emerald-800", error: "border-red-200 bg-red-50 text-red-800" };
  return <div className={`flex gap-3 rounded-lg border p-3.5 text-sm ${tones[tone]}`} role={tone === "error" ? "alert" : "status"}><Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" /><div><p className="font-medium">{title}</p><div className="mt-0.5 leading-5 opacity-80">{children}</div></div></div>;
}
