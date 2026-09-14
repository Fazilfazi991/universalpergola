# Universal Pergola UAT plan

Updated: 14 September 2026 for Phase 2I. Environment: hosted UAT project `jwyjuhtektmtqffnillj` (not Production). All business sign-offs remain `NOT RUN`; technical passes must not be promoted to stakeholder approval.

## How to run stakeholder UAT

Use the four clearly labeled UAT accounts for Management, Sales, Site Team, and Accounts to preserve role/security boundary coverage. These are test identities only and must never be converted into Production users. Credentials are generated locally in ignored `.qa-runtime/phase2h-uat-access.json`; distribute them through a password manager, never email or commit them, and rotate them after the session. For launch business acceptance, both partners complete the end-to-end workflow using Management/Admin access and record their name, date, evidence link, result, and sign-off. `TECH PASS / UAT PENDING` means automation proved the technical boundary, but the two real launch partners have not accepted the business behavior.

| Scenario ID | Role | Steps | Expected result | Actual result | Status | Notes |
|---|---|---|---|---|---|---|
| UAT-01A | Management | Login/logout; open dashboard, products and categories | Correct role overview; catalogue create/edit controls available | Chrome login and catalogue/list rendering passed | TECH PASS / UAT PENDING | Stakeholder must validate terminology and real catalogue workflow |
| UAT-01B | Management | Open UAT customer and enquiry; assign work; schedule visit | Unified customer/enquiry trail and permitted assignment controls | Linked customer, enquiry, visit and activity records verified | TECH PASS / UAT PENDING | Use only labeled UAT records |
| UAT-01C | Management | Open revised quote; view PDF; approve; convert once | Immutable revision, authoritative totals, approval actor/time, single project | Revision 1 approved; duplicate conversion rejected | TECH PASS / UAT PENDING | Commercial wording requires client approval |
| UAT-01D | Management | Open projects; stage/handover/completion; finance summary; feedback; reports | Operational completion and reports reconcile with source records | Active/completed projects, feedback and reports rendered | TECH PASS / UAT PENDING | Stakeholder report interpretation remains pending |
| UAT-02A | Sales | Login; assigned customer lookup; create/update lead and follow-up | Assigned CRM records are editable; activity is recorded | Sales customer and quotation routes passed; seeded ownership verified | TECH PASS / UAT PENDING | Manual stakeholder create/edit exercise pending |
| UAT-02B | Sales | Request site visit; create draft quote and revision; view relevant project/payment summary | Permitted workflow succeeds; aggregate finance only | Quote workflow seeded as Sales; assigned project visible | TECH PASS / UAT PENDING | Validate day-to-day field order and labels |
| UAT-02C | Sales | Attempt approval, finance mutation, unrelated record and user administration | Each restricted action is denied | Raw receipt read returned zero rows; finance route redirected; restricted approval covered by existing automated suite | TECH PASS / UAT PENDING | Direct user-admin UI is not exposed to Sales |
| UAT-03A | Site Team | Login at 390×844; open assigned visit; add measurement/photo; complete visit | Mobile controls remain usable; private photo and measurement persist | Assigned visit, 2 measurements, registry-backed photo and completion passed | TECH PASS / UAT PENDING | Physical camera capture must be exercised on a real phone |
| UAT-03B | Site Team | Open assigned project; task/update/file/handover actions where enabled | Only assigned operational scope is visible and mutable | Assigned project rendered; execution ledger and controls visible | TECH PASS / UAT PENDING | Installation photo capture on real hardware pending |
| UAT-03C | Site Team | Attempt unrelated visit/project, finance, quote edit and user administration | No private or commercial bypass | Cross-assignment update and receipt read denied; CRM direct route redirected | TECH PASS / UAT PENDING | Repeat with stakeholder account during UAT |
| UAT-04A | Accounts | Open dashboard/payments; review plan; post partial and final receipts | Milestones reconcile; immutable receipt numbers; outstanding updates | Partial active plan and fully paid completed plan reconcile | TECH PASS / UAT PENDING | Stakeholder must validate finance terminology |
| UAT-04B | Accounts | Upload proof; view receipt PDF; inspect overdue/outstanding | Private proof access is scoped; receipt values and status are correct | Storage policy suite and current PDF proof passed | TECH PASS / UAT PENDING | Current UAT receipt has no proof attached; upload exercise pending |
| UAT-04C | Accounts | Attempt project execution, CRM administration and site administration | Restricted mutation/route is denied | Project completion RPC denied; report route redirected; quotation mutation returned zero rows | TECH PASS / UAT PENDING | Customer read access is intentional for finance context |
| UAT-05A | Public | Browse catalogue/detail; submit product/general enquiry | Only published catalogue is visible; valid enquiry is accepted | Home/catalogue/enquiry pages rendered in Chrome; public RPC previously validated | TECH PASS / UAT PENDING | Form submission should be repeated by stakeholder without real personal data |
| UAT-05B | Public | Open feedback token, submit once, reload/reuse/expire; probe private tables | Minimal context only; one-time behavior; no private reads | Token context exposes 3 fields; raw customer/enquiry/project/payment/feedback reads denied | TECH PASS / UAT PENDING | Expiry/revocation suite covered in Phase 2G; stakeholder recheck pending |
| UAT-06 | End to end | Product → enquiry → customer → follow-up → visit → measurements/photo → quote/PDF → revision/approval → project/stages → handover → payments/receipt → completion → feedback/reports | Every handoff remains linked, authorized and auditable | Representative records and all intermediate links verified; generated quote/receipt rendered | TECH PASS / UAT PENDING | Business acceptance cannot be inferred from automation |

## Required sign-off record

| Area | Stakeholder | Date | Result | Evidence / issue IDs |
|---|---|---|---|---|
| Partner 1 — Management/Admin | Name pending | — | NOT RUN | — |
| Partner 2 — Management/Admin | Name pending | — | NOT RUN | — |
| Four-role security boundaries | Test identities | 14 September 2026 | TECH PASS | Phase 2H automated acceptance; stakeholder recheck optional |
| Public/customer wording | Both partners | — | NOT RUN | — |

Any failed expectation must be logged in `docs/UAT_ISSUES.md` with severity and owner. A P0 or unresolved P1 prevents Production approval.

Requested enhancements discovered during UAT are logged and deferred to a later feature phase unless the accountable business owner classifies them as defects against an already approved requirement. Phase 2I does not implement new feature requests.
