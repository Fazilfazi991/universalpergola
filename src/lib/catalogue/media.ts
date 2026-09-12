export const PRODUCT_MEDIA_BUCKET = "product-images";
export const CATEGORY_MEDIA_BUCKET = "category-images";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensions: Record<(typeof ALLOWED_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const uuidRegExp = new RegExp(`^${uuidPattern}$`);
const mediaPathPattern = new RegExp(`^${uuidPattern}/${uuidPattern}\\.(?:jpg|jpeg|png|webp)$`);

export function validateImageFile(file: Pick<File, "size" | "type">) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size <= 0) return "Choose a non-empty image file.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 10 MB or smaller.";
  return null;
}

export function createMediaPath(parentId: string, mimeType: string) {
  const extension = extensions[mimeType as keyof typeof extensions];
  if (!extension || !isUuid(parentId)) throw new Error("Invalid media path input.");
  return `${parentId}/${crypto.randomUUID()}.${extension}`;
}

export function isValidMediaPath(path: string) {
  return mediaPathPattern.test(path);
}

export function isUuid(value: string) {
  return uuidRegExp.test(value);
}
