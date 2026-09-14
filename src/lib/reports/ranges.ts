export const REPORT_PRESETS = ["today", "7d", "month", "last_month", "quarter", "custom"] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function startOfMonth(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }

export function resolveReportRange(params: Record<string, string | string[] | undefined>) {
  const requested = typeof params.range === "string" ? params.range : "month";
  const preset: ReportPreset = REPORT_PRESETS.includes(requested as ReportPreset) ? requested as ReportPreset : "month";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let from = new Date(today); let to = new Date(today);
  if (preset === "7d") from.setUTCDate(from.getUTCDate() - 6);
  if (preset === "month") from = startOfMonth(today);
  if (preset === "last_month") { to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)); from = startOfMonth(to); }
  if (preset === "quarter") { from = new Date(Date.UTC(today.getUTCFullYear(), Math.floor(today.getUTCMonth() / 3) * 3, 1)); }
  if (preset === "custom") {
    const customFrom = typeof params.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : iso(startOfMonth(today));
    const customTo = typeof params.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : iso(today);
    from = new Date(`${customFrom}T00:00:00Z`); to = new Date(`${customTo}T00:00:00Z`);
  }
  if (from > to) [from, to] = [to, from];
  return { preset, from: iso(from), to: iso(to), fromTimestamp: `${iso(from)}T00:00:00+04:00`, toTimestamp: `${iso(to)}T23:59:59.999+04:00` };
}
