export function locationTokenFromSite(value: string | null | undefined) {
  const segments = String(value || "")
    .trim()
    .replace(/^\s*\[[^\]]+\]\s*/i, "")
    .split(",")
    .map((segment) => segment.trim());
  let segment = segments[0] || "Location";
  if (/^(villa|plot|unit|house|building|warehouse|shop)\b/i.test(segment) && segments[1]) segment = segments[1];
  segment = segment.replace(/^Al\s+/i, "");
  const words = segment.match(/[A-Za-z0-9]+/g) || ["Location"];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("").slice(0, 48);
}

export function formatClientReference(sequence: number, locationToken: string, referenceDate: string) {
  const date = new Date(`${referenceDate.slice(0, 10)}T00:00:00Z`);
  if (!Number.isSafeInteger(sequence) || sequence < 1 || Number.isNaN(date.getTime())) throw new Error("Invalid client reference input.");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${String(sequence).padStart(3, "0")}-UP-${locationTokenFromSite(locationToken)}-${day}-${year}`;
}
