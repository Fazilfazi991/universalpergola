import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectFilePath,
  isValidProjectFilePath,
  MAX_PROJECT_FILE_BYTES,
  validateProjectFile,
} from "../src/lib/projects/media.ts";
import {
  projectActivityLabel,
  projectStatusLabel,
  stageStatusLabel,
} from "../src/lib/projects/presentation.ts";
import {
  projectDetailsSchema,
  projectFileSchema,
  projectTaskSchema,
  stageTransitionSchema,
} from "../src/lib/projects/validation.ts";

const projectId = "93b7bc93-f2a1-45ce-a2cf-df4d92fcc87d";
const fileId = "2bb0d3dc-88cb-47a8-9fbf-4c91e36bb4c0";

test("project file paths are project-scoped UUID paths with MIME-derived extensions", () => {
  const path = createProjectFilePath(projectId, fileId, "image/webp");
  assert.equal(path, `${projectId}/${fileId}.webp`);
  assert.equal(isValidProjectFilePath(path, projectId), true);
  assert.equal(isValidProjectFilePath(path, crypto.randomUUID()), false);
  assert.equal(isValidProjectFilePath(`${projectId}/../escape.webp`), false);
  assert.throws(() => createProjectFilePath("not-a-uuid", fileId, "image/webp"));
  assert.throws(() => createProjectFilePath(projectId, fileId, "text/plain"));
});

test("project file validation accepts supported private documents and enforces size", () => {
  assert.equal(validateProjectFile({ type: "application/pdf", size: 1024 } as File), null);
  assert.match(validateProjectFile({ type: "text/plain", size: 20 } as File) || "", /PDF, JPEG, PNG, or WebP/);
  assert.match(validateProjectFile({ type: "image/png", size: 0 } as File) || "", /non-empty/);
  assert.match(validateProjectFile({ type: "image/jpeg", size: MAX_PROJECT_FILE_BYTES + 1 } as File) || "", /20 MB/);
});

test("project schemas preserve distinct project, stage, task, and file controls", () => {
  assert.equal(projectDetailsSchema.safeParse({
    status: "active",
    priority: "high",
    start_date: "2026-09-13",
    expected_completion_date: "2026-10-31",
    installation_date: "",
    summary: "Customer-facing delivery summary",
    notes: "Internal execution notes",
  }).success, true);
  assert.equal(stageTransitionSchema.safeParse({ project_id: projectId, stage_id: crypto.randomUUID(), action: "complete", note: "Signed off" }).success, true);
  assert.equal(stageTransitionSchema.safeParse({ project_id: projectId, stage_id: crypto.randomUUID(), action: "teleport" }).success, false);
  assert.equal(projectTaskSchema.safeParse({ project_stage_id: "", assigned_to: "", title: "A", description: "", priority: "normal", due_at: "" }).success, false);
  assert.equal(projectFileSchema.safeParse({ project_id: projectId, stage_id: "", file_type: "drawing", file_name: "shop-drawing.pdf", mime_type: "application/pdf", file_size: 100, caption: "Issued drawing" }).success, true);
});

test("operational labels remain human-readable", () => {
  assert.equal(projectStatusLabel("on_hold"), "On hold");
  assert.equal(stageStatusLabel("in_progress"), "In progress");
  assert.equal(projectActivityLabel("stage.completed", { stage: "Manufacturing" }), "Stage completed · Manufacturing");
  assert.equal(projectActivityLabel("custom.event", {}), "Custom event");
});
