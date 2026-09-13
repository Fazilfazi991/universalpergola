import { isUuid } from "../crm/validation.ts";

export const PROJECT_FILE_BUCKET = "project-files";
export const MAX_PROJECT_FILE_BYTES = 20 * 1024 * 1024;
export const PROJECT_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
const extensions: Record<(typeof PROJECT_FILE_TYPES)[number], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const pathPattern = new RegExp(`^${uuid}/${uuid}\\.(?:pdf|jpg|png|webp)$`);

export function validateProjectFile(file: Pick<File, "size" | "type">) {
  if (!PROJECT_FILE_TYPES.includes(file.type as (typeof PROJECT_FILE_TYPES)[number])) return "Choose a PDF, JPEG, PNG, or WebP file.";
  if (file.size <= 0) return "Choose a non-empty file.";
  if (file.size > MAX_PROJECT_FILE_BYTES) return "Files must be 20 MB or smaller.";
  return null;
}
export function createProjectFilePath(projectId: string, fileId: string, mimeType: string) {
  if (!isUuid(projectId) || !isUuid(fileId)) throw new Error("Invalid project file identifiers.");
  const extension = extensions[mimeType as keyof typeof extensions];
  if (!extension) throw new Error("Invalid project file type.");
  return `${projectId}/${fileId}.${extension}`;
}
export function isValidProjectFilePath(path: string, projectId?: string) {
  return pathPattern.test(path) && (!projectId || path.startsWith(`${projectId}/`));
}
