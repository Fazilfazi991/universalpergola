# Phase 2I gate status

Recorded: 14 September 2026. Candidate baseline: `6c8bf86187982b6477129654e6457dbb6601da29`.

Phase 2I is a governance and infrastructure-readiness phase. It does not authorize feature work, a Production deployment, DNS changes, live traffic, reuse of the UAT database, or creation/invitation of real staff users.

## Gate A — stakeholder UAT closure

| Acceptance area | Required approver | Evidence required | Status |
|---|---|---|---|
| Catalogue | Management / catalogue owner | Approved category and product export, including publication state, pricing, images and display order | BLOCKED — no approved Production catalogue supplied |
| CRM | Management and Sales | Completed UAT scenarios, named signatories, date and issue references | BLOCKED — stakeholder UAT not run |
| Site visits | Management and Site Team | Completed desktop/mobile visit scenarios and physical-device evidence | BLOCKED — stakeholder and hardware acceptance not run |
| Quotations | Management and Sales | Workflow acceptance plus approved commercial wording record | BLOCKED — stakeholder UAT and wording approval missing |
| Projects | Management and Site Team | Stage, update, task, handover and completion acceptance | BLOCKED — stakeholder UAT not run |
| Payments and receipts | Management and Accounts | Payment-plan, receipt and reconciliation acceptance | BLOCKED — stakeholder UAT not run |
| Handover | Management and Site Team | Handover workflow and customer-facing wording acceptance | BLOCKED — stakeholder UAT not run |
| Feedback | Management / customer-service owner | Public token flow and customer-facing wording acceptance | BLOCKED — stakeholder UAT not run |
| Reports | Management and Accounts | Business interpretation and reconciliation acceptance | BLOCKED — stakeholder UAT not run |
| Permissions | Both launch partners | Management/Admin full-access confirmation plus four-role UAT boundary evidence | TECH PASS / PARTNER SIGN-OFF PENDING |

Technical prechecks remain `TECH PASS / UAT PENDING` in `UAT_PLAN.md`. Automation is evidence of implementation behavior, not business approval. Every stakeholder finding must be recorded in `UAT_ISSUES.md`; requested enhancements are deferred to a later feature phase unless required to close an agreed defect.

## Commercial document wording approval

The PDF layouts remain frozen. The values below are the current configured proposals and are not approved for Production use.

| Item | Current proposal | Required evidence | Status |
|---|---|---|---|
| Trading name | Universal Pergola | Written owner approval | AWAITING APPROVAL |
| Legal name | Universal Pergola Aluminium Glass Work SPS (LLC) | Written owner approval | AWAITING APPROVAL |
| Address | Shop No. 06, Ajman - Jurf - Opposite Big Bazar | Written owner approval | AWAITING APPROVAL |
| Website / email | www.universalpergola.com / pergola4uae@yahoo.com | Written owner approval | AWAITING APPROVAL |
| Telephone | +971 54 1789 866 / +971 56 161 1911 | Written owner approval | AWAITING APPROVAL |
| Signatory | Eltho Joseph Alexander — Manager / Designer | Written owner approval | AWAITING APPROVAL |
| Payment schedule | 50% advance / 40% progress / 10% completion | Written owner approval | AWAITING APPROVAL |
| Quote validity | Current configured terms | Exact approved wording and period | AWAITING APPROVAL |
| Advance and design charge | Current configured terms | Exact approved wording, amount/percentage and refund treatment | AWAITING APPROVAL |
| Photo permission / marketing | Current configured terms | Exact consent and usage wording | AWAITING APPROVAL |
| General terms | Current configured terms | Final clause-by-clause approval | AWAITING APPROVAL |

No PDF sample will be regenerated until the table above is approved. An approval must identify the approver, role, date, approved text/version and evidence location.

## Catalogue approval intake

Production import requires a complete, approved source with stable category/product identifiers, names, descriptions, pricing, publication state, display order and referenced image assets. The owner must confirm that the source contains no test labels, placeholder descriptions, fabricated prices or UAT-only media. The current hosted UAT catalogue is expressly prohibited as a Production seed source.

Status: **BLOCKED — approved catalogue source and owner sign-off not supplied.**

## Named staff readiness

Launch requires two named Management/Admin partner accounts with identical full access. Use `PRODUCTION_STAFF_MATRIX.md` to supply Partner 1 and Partner 2 names and work emails. Do not place passwords in the file and do not create or invite either user until the dedicated Production environment and provisioning window are explicitly authorized.

Sales, Site Team, and Accounts remain available for later expansion but are not Production launch accounts. The four existing UAT accounts remain unchanged for role/security boundary testing and must never be converted into Production users. Management/Admin full access is verified in `MANAGEMENT_ACCESS_VERIFICATION.md`.

Status: **BLOCKED — two partner names and emails not supplied.**

## Gate B — Production infrastructure

| Control | Status | Evidence / next decision |
|---|---|---|
| Dedicated Supabase project authorized | BLOCKED | Only UAT project `jwyjuhtektmtqffnillj` exists; no creation authorization received |
| Organization / project name / region / plan | BLOCKED | Organization `Pergola` (`vlnviszmbwuzhrihirjr`) exists; Production choices are unapproved |
| Backup entitlement, RPO and RTO | BLOCKED | No Production plan or recovery objectives approved |
| Leaked-password protection | BLOCKED | Must be supported and enabled in the selected Production plan |
| Production migrations | NOT STARTED | Apply only after the dedicated Production project is explicitly confirmed |
| Production Auth / SMTP | NOT STARTED | Requires approved domain, redirects, signup policy and mail provider |
| Production data seed | NOT STARTED | Requires approved catalogue and controlled seed manifest |
| Production staff provisioning | NOT STARTED | Create only two Management/Admin partner accounts after names/emails, approved matrix and explicit provisioning authority; no Sales/Site Team/Accounts launch users |
| Vercel project / variables | PARTIAL / NOT PRODUCTION-READY | Checkout is linked, but the current hosted configuration points to UAT; isolated Production Supabase variables and launch authorization are still missing |
| Non-live candidate deployment | NOT STARTED | Allowed only after infrastructure controls pass; never a live cutover in Phase 2I |
| Production smoke and rollback rehearsal | NOT STARTED | Requires isolated Production candidate and recorded restore/rollback evidence |

## Gate decision

Gate A: **BLOCKED**. Gate B: **BLOCKED**. Overall decision: **NO-GO**.

The next authorized action is stakeholder/input collection only. Infrastructure creation begins only after Gate A evidence is complete and the Production decisions in `PRODUCTION_INFRASTRUCTURE_PLAN.md` are approved in writing.
