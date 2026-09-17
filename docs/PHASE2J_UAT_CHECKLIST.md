# Phase 2J Stakeholder UAT Checklist

Commercial-document and confirmed client-reference checks are tracked in [COMMERCIAL_DOCUMENTS_UAT.md](./COMMERCIAL_DOCUMENTS_UAT.md).

Environment: Vercel Preview from `uat/phase-2j` using the existing Pergola UAT Supabase project (`jwyjuhtektmtqffnillj`).

These checks are for stakeholder review only. The current execution-stage weights and expense categories are test/default values; they are not approved Production defaults.

## How to record feedback

Record each comment with one priority label:

- `P0` — blocks UAT or risks data/security
- `P1` — must be corrected before launch
- `P2` — important improvement, not launch-blocking
- `P3` — minor wording, polish, or convenience
- `NEW FEATURE` — new scope; record for later review and do not implement automatically

## A. Project Expenses

- [ ] Can material purchases be entered against the correct project?
- [ ] Are the available expense categories appropriate?
- [ ] Is the project cost summary clear and useful?
- Comments / priority:

## B. Workshop / Common Expenses

- [ ] Can non-project purchases be recorded correctly?
- [ ] Is it clear when an expense should not be linked to a project?
- Comments / priority:

## C. Labour Wages

- [ ] Does the simple worker/wage entry structure match the current workflow?
- [ ] Are project-linked and workshop/common labour costs understandable?
- Comments / priority:

## D. Bills

- [ ] Is **Scan / Upload Bill** easy to find and use?
- [ ] Can a mobile camera be used to capture a bill?
- [ ] Can an existing image or PDF be uploaded from the device?
- [ ] Is the uploaded document associated with the intended expense?
- Comments / priority:

## E. Assets / Machinery

- [ ] Can existing machinery be recorded clearly?
- [ ] Can planned purchases be recorded clearly?
- [ ] Are the asset statuses appropriate?
- [ ] Are purchase values and supporting documents understandable?
- Comments / priority:

## F. Project Advancement

- [ ] Are the execution stages correct and in the right order?
- [ ] Are stage percentages useful and understandable?
- [ ] Are the current test/default stage weights acceptable for later Production approval?
- [ ] Is overall project progress understandable?
- [ ] Is the timeline/progress chart useful for management review?
- Comments / priority:

## Previous-module regression check

- [ ] Existing customer payments remain visible and usable.
- [ ] Existing quotations and approvals/revisions remain visible and usable.
- [ ] Existing project workflow, tasks, files, and handover remain usable.
- [ ] Both partner UAT Management/Admin accounts can sign in and have the same full access.
- [ ] Sign-out works and a protected route requires authentication afterward.

## Stakeholder sign-off

- Reviewer:
- Review date:
- Outcome: `Accepted` / `Accepted with P2-P3 notes` / `Changes required`
- Open P0/P1 items:
- Production-default approval for expense categories: `Pending`
- Production-default approval for stage weights: `Pending`
