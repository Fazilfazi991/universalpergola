import { isUuid } from "../crm/validation.ts";

export const SITE_PHOTO_BUCKET = "site-visit-photos";
export const MAX_SITE_PHOTO_BYTES = 10 * 1024 * 1024;
export const SITE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensions: Record<(typeof SITE_PHOTO_TYPES)[number], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const pathPattern = new RegExp(`^${uuid}/${uuid}\\.(?:jpg|jpeg|png|webp)$`);

export function validateSitePhoto(file: Pick<File, "size" | "type">) {
  if (!SITE_PHOTO_TYPES.includes(file.type as (typeof SITE_PHOTO_TYPES)[number])) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size <= 0) return "Choose a non-empty image.";
  if (file.size > MAX_SITE_PHOTO_BYTES) return "Each photo must be 10 MB or smaller.";
  return null;
}

export function createSitePhotoPath(visitId: string, mimeType: string) {
  if (!isUuid(visitId)) throw new Error("Invalid visit identifier.");
  const extension = extensions[mimeType as keyof typeof extensions];
  if (!extension) throw new Error("Invalid photo type.");
  return `${visitId}/${crypto.randomUUID()}.${extension}`;
}

export function isValidSitePhotoPath(path: string, visitId?: string) {
  return pathPattern.test(path) && (!visitId || path.startsWith(`${visitId}/`));
}
