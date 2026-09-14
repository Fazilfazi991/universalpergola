# Management/Admin full-access verification

Verified: 14 September 2026 against candidate `8e99605c1035e200fe68d7dfdd6ccc1fbc42647d` and migration head `20260914120000_phase_2h_site_visit_update_policy.sql`.

## Result

**PASS — no permission gap was found.** The application role stored as `admin` and presented as `Admin / Management` already has full access to every existing launch module. No permission, RLS, policy, RPC, route, or role-architecture change is required.

| Launch capability | Management/Admin access | Verification basis |
|---|---|---|
| Dashboard | FULL | Any active recognized profile can open the overview; Management receives every management summary |
| Products | FULL | `admin` module access plus management-only create/edit/publish/archive/media actions |
| Categories | FULL | `admin` module access plus management-only create/edit/order/activate/archive/media actions |
| Customers | FULL | `admin` module access, unrestricted CRM access and management-only assignment/archive controls |
| Enquiries | FULL | `admin` module access, unrestricted CRM access, assignment and lifecycle controls |
| Follow-ups | FULL | Management is included in enquiry/site-visit activity and task access policies |
| Site visits | FULL | `admin` module access, unrestricted visit read/write and assignment controls |
| Measurements | FULL | Management is explicitly allowed by site-visit measurement policies and guarded actions |
| Site photos | FULL | Management is explicitly allowed to view, upload, finalize and delete registered visit media |
| Quotations | FULL | `admin` module access and unrestricted quotation scope |
| Quotation approvals | FULL | Approval/rejection and project-conversion controls require Management |
| Projects | FULL | `admin` module access and unrestricted project visibility/management |
| Project stages | FULL | Management can configure, plan, transition, skip and reopen stages |
| Tasks | FULL | `admin` module access plus project task create/assign/transition controls |
| Files | FULL | Management can view, upload, finalize, download and remove project files |
| Handover | FULL | Management is an allowed project operator and can reopen completed handovers |
| Payments | FULL | `admin` module access and finance RPC/policy access shared with Accounts |
| Payment milestones | FULL | Management can configure, activate and cancel payment plans/milestones |
| Payment receipts | FULL | Management can record, inspect, generate and void receipts and manage proofs |
| Feedback | FULL | `admin` module access plus request, record, review and archive controls |
| Reports | FULL | `admin` module access and Management/Accounts reporting RPC access |

## Security boundary confirmation

- The role enum remains `admin`, `sales`, `site_team`, and `accounts`.
- `requireManagement()` still resolves only to the `admin` role.
- A normal authenticated user is not automatically an administrator.
- Sales, Site Team, and Accounts module permissions and RLS policies remain intact for future staffing.
- The four temporary UAT users remain separate test identities used to validate role boundaries.
- Only the two future partner profiles are authorized to receive `admin` for launch; they will not be created until names, emails, the dedicated Production project, and provisioning approval are supplied.

## Evidence reviewed

- Application module map and management guard: `src/lib/auth/permissions.ts`, `src/lib/auth/dal.ts`.
- Route/action guards under `src/app/dashboard`.
- Catalogue, CRM, site-visit, quotation, project, payment, feedback, report, and Storage policies/RPCs in the committed Supabase migrations.
- Existing automated authorization tests and the Phase 2H four-role hosted UAT acceptance record.
