# Production configuration checklist

Updated: 14 September 2026 for Phase 2I. Current recommendation: **NO-GO for Production; stakeholder UAT closure is required.**

| Control | Status | Evidence / required action |
|---|---|---|
| Separate Production Supabase project confirmed | BLOCKED | Read-only inventory finds only UAT `jwyjuhtektmtqffnillj`; no creation authorization received |
| Migrations apply through `20260916151030` | UAT PASS | Phase 2J additive migrations applied to linked UAT; repeat on Production only after authorization |
| Auth site URL and redirect allow list | BLOCKED | UAT still uses localhost; set exact Production HTTPS origins at cutover |
| Open signup decision | BLOCKED | Hosted signup is enabled; client must approve and Production should normally disable it |
| Password policy | BLOCKED | Current minimum is 6 with no complexity requirement; approve stronger Production policy |
| Leaked-password protection | BLOCKED | Disabled; enabling was rejected because the current plan does not support it |
| Production SMTP/recovery emails | BLOCKED | Not configured or tested |
| Production domain / DNS | BLOCKED | No domain authorized; Phase 2H made no DNS change |
| Vercel Production variables | BLOCKED | CLI is authenticated as `fazilfazi991`, but the checkout is unlinked and no project/values are authorized |
| Secrets excluded from Git/client | PASS | `.env*` ignored; no deployed secret/service-role key; UAT credentials ignored |
| Storage buckets and policies | UAT PASS | Five private buckets; registry/path/role policies validated; repeat on Production |
| RLS coverage | UAT PASS | Zero public tables with RLS disabled; representative bypass suite passed |
| SECURITY DEFINER/public RPC review | ACCEPTED BY DESIGN | RPCs validate role/token/input and use narrow grants; retain regression tests |
| Product/site/payment media backup | BLOCKED | Independent Storage backup and restore not rehearsed |
| Quotation/receipt branding | UAT PASS | Frozen references and generated A4 proofs visually reviewed |
| Contact details and signatory | NEEDS CLIENT SIGN-OFF | Rendered correctly from the current configuration; client must confirm final legal use |
| Commercial terms/wording | BLOCKED | UAT quote intentionally contains placeholder terms; client-approved terms required |
| Real staff users | BLOCKED | Launch requires exactly two named Management/Admin partner accounts with identical full access; names/emails and Production authorization are pending |
| Real product catalogue | BLOCKED | Current dataset is explicitly UAT placeholder content |
| Database backup/PITR | BLOCKED | PITR off; no available backup listed; restore unverified |
| Git rollback target | READY | Verified Phase 2H candidate `6c8bf86187982b6477129654e6457dbb6601da29`; Phase 2I candidate reported after commit |
| Performance | CONDITIONAL | Warm Chrome max 3.8 s; one cold hosted Site Team load reached ~34 s and needs preview monitoring |
| Chrome smoke tests | UAT PASS | 19 routes at 390×844, 1280×720 and 1440×900 |
| Edge/Safari coverage | NOT RUN | Browsers/platform unavailable in this pass; do not infer compatibility |
| Stakeholder UAT sign-off | BLOCKED | Both business partners must sign off the launch workflows; four temporary UAT role accounts remain for security-boundary testing |
| Production smoke/rollback rehearsal | BLOCKED | Must run against the authorized Production candidate before DNS/live traffic |

Production approval requires every `BLOCKED` item to be closed or explicitly accepted in writing by the accountable client owner; security, backup, real-data/user and stakeholder-signoff items cannot be waived by the implementation team alone.

See `PHASE2I_GATE_STATUS.md`, `PRODUCTION_STAFF_MATRIX.md`, `MANAGEMENT_ACCESS_VERIFICATION.md`, `PRODUCTION_INFRASTRUCTURE_PLAN.md`, and `PHASE2I_ROLLBACK_RECORD.md` for the approval and execution records. No real Production user has been created; the four UAT identities remain test-only.
