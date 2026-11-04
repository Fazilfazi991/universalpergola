"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type PasswordState, type ProfileState } from "@/app/dashboard/profile/actions";

const fieldClass = "min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-graphite";
const labelClass = "mb-1.5 block text-sm font-medium text-graphite";

export function ProfileForms({ profile }: { profile: { fullName: string; username: string; email: string; role: string } }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, {} as ProfileState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, {} as PasswordState);
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-paper p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Edit profile</h2>
        <form action={profileAction} data-profile-form className="mt-5 space-y-4">
          <div><label className={labelClass} htmlFor="fullName">Display name</label><input className={fieldClass} id="fullName" name="fullName" defaultValue={profile.fullName} required maxLength={120} disabled={profilePending} />{profileState.fieldErrors?.fullName && <p className="mt-1 text-sm text-red-700">{profileState.fieldErrors.fullName[0]}</p>}</div>
          <div><label className={labelClass} htmlFor="profileUsername">Username</label><input className={fieldClass} id="profileUsername" name="username" defaultValue={profile.username} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={32} disabled={profilePending} />{profileState.fieldErrors?.username && <p className="mt-1 text-sm text-red-700">{profileState.fieldErrors.username[0]}</p>}</div>
          <div><label className={labelClass} htmlFor="profileEmail">Email address</label><input className={`${fieldClass} bg-stone/5`} id="profileEmail" value={profile.email} readOnly aria-readonly="true" /></div>
          <div><label className={labelClass} htmlFor="profileRole">Role</label><input className={`${fieldClass} bg-stone/5`} id="profileRole" value={profile.role} readOnly aria-readonly="true" /></div>
          {profileState.message && <p role="status" className={`text-sm ${profileState.status === "error" ? "text-red-700" : "text-green-800"}`}>{profileState.message}</p>}
          <button type="submit" disabled={profilePending} className="min-h-11 rounded-lg bg-graphite px-5 text-sm font-semibold text-white disabled:opacity-50">{profilePending ? "Saving…" : "Save profile"}</button>
        </form>
      </section>
      <section id="change-password" className="scroll-mt-24 rounded-xl border border-line bg-paper p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-stone">After changing your password, sign in again on all devices.</p>
        <form action={passwordAction} data-profile-form className="mt-5 space-y-4">
          <div><label className={labelClass} htmlFor="currentPassword">Current password</label><input className={fieldClass} id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required disabled={passwordPending} />{passwordState.fieldErrors?.currentPassword && <p className="mt-1 text-sm text-red-700">{passwordState.fieldErrors.currentPassword[0]}</p>}</div>
          <div><label className={labelClass} htmlFor="newPassword">New password</label><input className={fieldClass} id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={12} disabled={passwordPending} />{passwordState.fieldErrors?.newPassword && <p className="mt-1 text-sm text-red-700">{passwordState.fieldErrors.newPassword[0]}</p>}</div>
          <div><label className={labelClass} htmlFor="confirmPassword">Confirm new password</label><input className={fieldClass} id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required disabled={passwordPending} />{passwordState.fieldErrors?.confirmPassword && <p className="mt-1 text-sm text-red-700">{passwordState.fieldErrors.confirmPassword[0]}</p>}</div>
          {passwordState.message && <p role="alert" className="text-sm text-red-700">{passwordState.message}</p>}
          <button type="submit" disabled={passwordPending} className="min-h-11 rounded-lg bg-graphite px-5 text-sm font-semibold text-white disabled:opacity-50">{passwordPending ? "Updating…" : "Change password"}</button>
        </form>
      </section>
    </div>
  );
}
