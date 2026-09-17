# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Universal Pergola staff use the application to manage catalogue, customer, sales, site, project, financial, and handover operations. At launch, the primary users are business partners ELTHO and MYRIAM, both using the existing Management/Admin role with full access. Sales, Site Team, and Accounts roles remain available for future staffing and UAT boundary testing.

## Product Purpose

Universal Pergola is the company’s private operational system, carrying work from enquiry through quotation, project execution, payment, receipt, feedback, and reporting. Success means the partners can find current records quickly, preserve reliable commercial snapshots, and complete day-to-day work without separate spreadsheets or duplicate records.

## Positioning

The product is a single operational source of truth tailored to Universal Pergola’s actual sales-to-handover workflow, joining commercial documents and site execution without becoming a general accounting package.

## Operating Context

Staff use the system on desktop and mobile in office, workshop, and site contexts. Commercial documents include quotations, invoices, and payment receipts. Payments and receipts remain the authoritative record of money received. The shared client/job reference follows `[SEQUENCE]-UP-[LOCATION]-[DAY]-[YEAR]`, while quotation, invoice, receipt, and project numbers remain separate internal identifiers.

## Capabilities and Constraints

- Supabase Auth, row-level security, and application authorization protect private operational data.
- Management/Admin has full access; role boundaries for Sales, Site Team, and Accounts must remain intact.
- Commercial-document additions reuse the verified quotation and receipt workflows; invoice support is intentionally lightweight and is not a general ledger.
- Document numbers and the shared client/job sequence are generated concurrently and safely by the database and are never reused.
- Issued commercial values are snapshots and must not silently change with live product data.
- Production deployment, Production data, and automatic merges to `main` are outside the current UAT scope.

## Brand Commitments

The product name is Universal Pergola. The client-supplied logo in `branding/universal-pergola-logo-official.pdf` is the official branding source and must retain its aspect ratio, wings, wordmark, and tagline. The confirmed document family uses the existing black, warm brass, limestone, and paper visual language.

## Evidence on Hand

- Official logo master: `branding/universal-pergola-logo-official.pdf`
- Existing verified quotation and receipt PDF implementations in `src/lib/quotations/pdf.ts` and `src/lib/payments/pdf.ts`
- Existing UAT workflows and data in the linked Supabase project `jwyjuhtektmtqffnillj`
- Client-confirmed reference example: `006-UP-Barsha-17-2026`, where `17` is the day of month

## Product Principles

- Preserve one source of truth instead of duplicating records or money movements.
- Make operational status and next actions legible at a glance.
- Keep authorization explicit at every route, action, database policy, and file boundary.
- Preserve immutable commercial history while allowing controlled draft correction.
- Extend the existing workflow and visual language without widening scope into general accounting.

## Accessibility & Inclusion

Core workflows must remain keyboard accessible, maintain readable contrast, provide explicit labels and recovery-oriented errors, and work without horizontal page overflow at 390px mobile width.
