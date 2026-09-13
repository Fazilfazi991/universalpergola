"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  addSiteMeasurementAction,
  addSiteVisitNoteAction,
  createSiteFollowUpAction,
  registerSitePhotoAction,
  releaseSitePhotoReservationAction,
  updateSiteVisitAction,
  updateSiteVisitContentAction,
} from "@/app/dashboard/site-visits/actions";
import type { AppRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/client";
import {
  MEASUREMENT_UNITS,
  PHOTO_TYPE_SUGGESTIONS,
} from "@/lib/site-visits/constants";
import {
  createSitePhotoPath,
  SITE_PHOTO_BUCKET,
  validateSitePhoto,
} from "@/lib/site-visits/media";
import type { SiteVisitDetail } from "@/lib/site-visits/queries";
import {
  INITIAL_SITE_VISIT_ACTION_STATE,
  type VisitStaff,
} from "@/lib/site-visits/types";

const input =
  "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base";
function localDateTime(value?: string | null) {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 4 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
function Notice({ state }: { state: typeof INITIAL_SITE_VISIT_ACTION_STATE }) {
  return state.message ? (
    <p
      role="status"
      className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
    >
      {state.message}
    </p>
  ) : null;
}

export function VisitScheduleEditor({ visit }: { visit: SiteVisitDetail }) {
  const [state, action, pending] = useActionState(
    updateSiteVisitAction.bind(null, visit.id),
    INITIAL_SITE_VISIT_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-4">
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Visit date and time
          <input
            className={input}
            type="datetime-local"
            name="scheduled_at"
            defaultValue={localDateTime(visit.scheduled_at)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Site address
          <textarea
            className={`${input} min-h-20 py-3`}
            name="site_address"
            defaultValue={visit.site_address}
            maxLength={500}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Area
          <input
            className={input}
            name="area"
            defaultValue={visit.area || ""}
            maxLength={120}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Emirate
          <input
            className={input}
            name="emirate"
            defaultValue={visit.emirate || ""}
            maxLength={80}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Google Maps link
          <input
            className={input}
            type="url"
            inputMode="url"
            name="location_url"
            defaultValue={visit.location_url || ""}
            maxLength={1000}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Contact person
          <input
            className={input}
            name="contact_person"
            defaultValue={visit.contact_person || ""}
            maxLength={160}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Contact phone
          <input
            className={input}
            inputMode="tel"
            name="contact_phone"
            defaultValue={visit.contact_phone || ""}
            maxLength={40}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Preparation / visit notes
          <textarea
            className={`${input} min-h-28 py-3`}
            name="notes"
            defaultValue={visit.notes || ""}
            maxLength={8000}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Next action
          <input
            className={input}
            name="next_action"
            defaultValue={visit.next_action || ""}
            maxLength={300}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Next action due
          <input
            className={input}
            type="datetime-local"
            name="next_action_at"
            defaultValue={localDateTime(visit.next_action_at)}
          />
        </label>
      </div>
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save schedule and site"}
      </button>
    </form>
  );
}

export function VisitContentEditor({ visit }: { visit: SiteVisitDetail }) {
  const [state, action, pending] = useActionState(
    updateSiteVisitContentAction.bind(null, visit.id),
    INITIAL_SITE_VISIT_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-4">
      <Notice state={state} />
      <label className="grid gap-2 text-sm font-medium">
        Measurement summary
        <textarea
          className={`${input} min-h-24 py-3`}
          name="measurement_summary"
          defaultValue={visit.measurement_summary || ""}
          maxLength={4000}
          placeholder="Overall dimensions, constraints, and practical summary"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Visit notes
        <textarea
          className={`${input} min-h-28 py-3`}
          name="notes"
          defaultValue={visit.notes || ""}
          maxLength={8000}
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          className="size-5 accent-brass-dark"
          type="checkbox"
          name="follow_up_required"
          defaultChecked={visit.follow_up_required}
        />
        Follow-up required
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Next action
          <input
            className={input}
            name="next_action"
            defaultValue={visit.next_action || ""}
            maxLength={300}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Due
          <input
            className={input}
            type="datetime-local"
            name="next_action_at"
            defaultValue={localDateTime(visit.next_action_at)}
          />
        </label>
      </div>
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save visit notes"}
      </button>
    </form>
  );
}

export function AddMeasurementForm({
  visitId,
  nextOrder,
}: {
  visitId: string;
  nextOrder: number;
}) {
  const [state, action, pending] = useActionState(
    addSiteMeasurementAction.bind(null, visitId),
    INITIAL_SITE_VISIT_ACTION_STATE,
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-line bg-limestone p-4"
    >
      <h3 className="text-sm font-semibold">Add measurement</h3>
      <Notice state={state} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium sm:col-span-2 xl:col-span-1">
          Label
          <input
            className={input}
            name="label"
            required
            maxLength={120}
            placeholder="Pergola width"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Width
          <input
            className={input}
            name="width"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Height
          <input
            className={input}
            name="height"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Length / depth
          <input
            className={input}
            name="length"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="0.001"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Unit
          <select className={input} name="unit" defaultValue="mm">
            {MEASUREMENT_UNITS.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Quantity
          <input
            className={input}
            name="quantity"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            defaultValue="1"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2 xl:col-span-3">
          Notes
          <input
            className={input}
            name="notes"
            maxLength={1000}
            placeholder="Reference point or installation constraint"
          />
        </label>
      </div>
      <input type="hidden" name="sort_order" value={nextOrder} />
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add measurement"}
      </button>
    </form>
  );
}

export function SiteVisitNoteForm({ visitId }: { visitId: string }) {
  const [state, action, pending] = useActionState(
    addSiteVisitNoteAction.bind(null, visitId),
    INITIAL_SITE_VISIT_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="grid gap-2 text-sm font-medium">
        Add site note
        <textarea
          className={`${input} min-h-24 py-3`}
          name="note"
          required
          maxLength={4000}
        />
      </label>
      <Notice state={state} />
      <button
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-paper px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add note"}
      </button>
    </form>
  );
}

export function SiteFollowUpForm({
  visit,
  staff,
  role,
  currentUserId,
}: {
  visit: SiteVisitDetail;
  staff: VisitStaff[];
  role: AppRole;
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState(
    createSiteFollowUpAction.bind(
      null,
      visit.id,
      visit.customer_id,
      visit.enquiry_id,
    ),
    INITIAL_SITE_VISIT_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Due
          <input
            className={input}
            type="datetime-local"
            name="due_at"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Assigned to
          <select
            className={input}
            name="assigned_to"
            defaultValue={
              role === "site_team" ? currentUserId : visit.assigned_to || ""
            }
            disabled={role === "site_team"}
          >
            <option value="">Choose staff</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
          {role === "site_team" && (
            <input type="hidden" name="assigned_to" value={currentUserId} />
          )}
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Next action
          <input
            className={input}
            name="next_action"
            required
            maxLength={200}
            placeholder="Send measurements to Sales"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Notes
          <textarea
            className={`${input} min-h-20 py-3`}
            name="notes"
            maxLength={2000}
          />
        </label>
      </div>
      <Notice state={state} />
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add follow-up"}
      </button>
    </form>
  );
}

type PendingPhoto = {
  key: string;
  file: File;
  preview: string;
  status: "ready" | "uploading" | "uploaded" | "error";
  error?: string;
};
export function SitePhotoUploader({
  visitId,
  existingCount,
}: {
  visitId: string;
  existingCount: number;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<PendingPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState("");
  const [busy, setBusy] = useState(false);
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(
    () => () =>
      filesRef.current.forEach((item) => URL.revokeObjectURL(item.preview)),
    [],
  );
  function choose(selected: FileList | null) {
    if (!selected) return;
    setFiles((current) => {
      const keys = new Set(current.map((item) => item.key));
      const additions: PendingPhoto[] = [];
      for (const file of Array.from(selected)) {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (keys.has(key)) continue;
        const error = validateSitePhoto(file);
        additions.push({
          key,
          file,
          preview: URL.createObjectURL(file),
          status: error ? "error" : "ready",
          error: error || undefined,
        });
        keys.add(key);
      }
      return [...current, ...additions].slice(0, 12);
    });
  }
  async function upload(
    items = files.filter(
      (item) => item.status === "ready" || item.status === "error",
    ),
  ) {
    if (!items.length || busy) return;
    setBusy(true);
    const supabase = createClient();
    for (const item of items) {
      const error = validateSitePhoto(item.file);
      if (error) {
        setFiles((all) =>
          all.map((entry) =>
            entry.key === item.key
              ? { ...entry, status: "error", error }
              : entry,
          ),
        );
        continue;
      }
      setFiles((all) =>
        all.map((entry) =>
          entry.key === item.key
            ? { ...entry, status: "uploading", error: undefined }
            : entry,
        ),
      );
      const path = createSitePhotoPath(visitId, item.file.type);
      const metadata = {
        site_visit_id: visitId,
        storage_path: path,
        caption,
        photo_type: photoType,
        mime_type: item.file.type,
        file_size: item.file.size,
        sort_order: (existingCount + files.indexOf(item) + 1) * 10,
      };
      const registered = await registerSitePhotoAction(metadata);
      if (registered.status === "error") {
        setFiles((all) =>
          all.map((entry) =>
            entry.key === item.key
              ? { ...entry, status: "error", error: registered.message }
              : entry,
          ),
        );
        continue;
      }
      const stored = await supabase.storage
        .from(SITE_PHOTO_BUCKET)
        .upload(path, item.file, {
          contentType: item.file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (stored.error) {
        await releaseSitePhotoReservationAction(metadata);
        setFiles((all) =>
          all.map((entry) =>
            entry.key === item.key
              ? { ...entry, status: "error", error: stored.error.message }
              : entry,
          ),
        );
        continue;
      }
      setFiles((all) =>
        all.map((entry) =>
          entry.key === item.key ? { ...entry, status: "uploaded" } : entry,
        ),
      );
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Photo category{" "}
          <span className="font-normal text-stone">optional</span>
          <input
            className={input}
            value={photoType}
            onChange={(event) => setPhotoType(event.target.value)}
            list="site-photo-types"
            maxLength={80}
          />
          <datalist id="site-photo-types">
            {PHOTO_TYPE_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Caption <span className="font-normal text-stone">optional</span>
          <input
            className={input}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={300}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Choose site photos
        <input
          className="min-h-12 rounded-md border border-line bg-limestone px-3 py-2 text-base"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          onChange={(event) => choose(event.target.files)}
        />
      </label>
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((item) => (
            <div
              key={item.key}
              className="overflow-hidden rounded-md border border-line bg-paper"
            >
              <Image
                src={item.preview}
                alt="Selected site preview"
                width={400}
                height={300}
                unoptimized
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-2">
                <p className="truncate text-xs">{item.file.name}</p>
                <p
                  className={`mt-1 text-xs ${item.status === "error" ? "text-red-700" : item.status === "uploaded" ? "text-emerald-700" : "text-stone"}`}
                >
                  {item.status === "uploading"
                    ? "Uploading…"
                    : item.status === "uploaded"
                      ? "Uploaded"
                      : item.error || "Ready"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={
          busy ||
          !files.some(
            (item) => item.status === "ready" || item.status === "error",
          )
        }
        onClick={() => upload()}
        className="min-h-12 rounded-md bg-graphite px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy
          ? `Uploading ${files.filter((item) => item.status === "uploaded").length + 1} of ${files.length}…`
          : "Upload selected photos"}
      </button>
      <p className="text-xs leading-5 text-stone">
        JPEG, PNG, or WebP. Up to 10 MB each. Duplicate selections are ignored;
        failed files remain available to retry.
      </p>
    </div>
  );
}
