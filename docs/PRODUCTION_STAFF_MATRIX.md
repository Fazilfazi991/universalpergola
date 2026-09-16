# Production staff matrix

Status: **BLOCKED — launch roles are approved; two partner names and work emails are pending.**

The launch requirement is exactly two real partner accounts. Both receive the application `admin` role, displayed as **Management/Admin**, with the same full system permissions. Complete their names and work emails before any Production account is created. Never record temporary or permanent passwords, recovery codes, access tokens or service keys here.

| Launch user | Name | Email | Application role | Access | Provisioning status |
|---|---|---|---|---|---|
| ELTHO (Partner 1) | Pending | Pending | Management/Admin (`admin`) | Full | NOT AUTHORIZED |
| MYRIAM (Partner 2) | Pending | Pending | Management/Admin (`admin`) | Full | NOT AUTHORIZED |

Both rows must have identical authorization. `MANAGEMENT_ACCESS_VERIFICATION.md` records the verified full-access surface.

## Roles retained for future use

Sales, Site Team, and Accounts remain supported application roles with their existing restricted capabilities and RLS policies. They are not required as real Production accounts at launch and must not be provisioned unless later requested.

## Temporary UAT accounts

The following non-real accounts remain unchanged and are used only for role/security testing:

| UAT identity | Test role | Production treatment |
|---|---|---|
| UAT Management | Management/Admin | Keep as UAT test identity; never convert |
| UAT Sales | Sales | Keep as UAT test identity; never convert |
| UAT Site Team | Site Team | Keep as UAT test identity; never convert |
| UAT Accounts | Accounts | Keep as UAT test identity; never convert |

These accounts validate role boundaries. They are not launch staff and must not be copied, promoted, renamed, or invited into Production.

## Required checks

- Both launch partners have unique named identities and the `admin` application role.
- Shared accounts and personal email addresses are rejected.
- The two profiles receive identical full access; no other real profile receives `admin` without later approval.
- Management confirms which partner(s) may administer future staff access.
- Sales, Site Team, and Accounts Production identities remain unprovisioned at launch.
- Offboarding and role-change owners are named.
- Invitation delivery, first-login password setup and MFA policy are approved.

Provisioning hold point: create only Partner 1 and Partner 2 after their actual names/emails, the dedicated Production project, Auth/SMTP configuration, matrix approval, and provisioning window are confirmed in writing. Do not create Sales, Site Team, or Accounts Production users unless later requested.
