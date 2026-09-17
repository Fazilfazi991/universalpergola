# Commercial Documents UAT

## Scope

This UAT patch adds a private Commercial Documents area for Management/Admin and the existing Accounts role. It reuses the verified quotation and payment-receipt records and adds a lightweight commercial invoice workflow. It does not add a general ledger, VAT filing, journals, supplier accounting, recurring invoices, credit notes, or a payment gateway.

## Shared client/job reference

The confirmed format is `[SEQUENCE]-UP-[LOCATION]-[DAY]-[YEAR]`.

Example: `006-UP-Barsha-17-2026`

- `006`: database-generated running sequence, zero-padded to at least three digits, concurrency-safe, and never reused.
- `UP`: fixed Universal Pergola identifier.
- `Barsha`: human-readable location token derived from the project/site location. Management can correct it without changing the sequence.
- `17`: two-digit day of month from the project/reference date.
- `2026`: four-digit year from the project/reference date.

The month is intentionally not included. Internal identifiers remain independent and unchanged:

- Quotation: `UP-Q-YYYY-NNNNNN`
- Invoice: `UP-I-YYYY-NNNNNN`
- Receipt: `UP-R-YYYY-NNNNNN`
- Project: `UP-P-YYYY-NNNNNN`

## UAT routes

- Commercial Documents: `/dashboard/documents`
- Invoices: `/dashboard/invoices`
- Generate invoice: `/dashboard/invoices/new`
- Invoice detail/PDF: `/dashboard/invoices/[id]` and `/dashboard/invoices/[id]/pdf`

## Acceptance checklist

### Reference

- [ ] Open or create a UAT project in Al Barsha.
- [ ] Confirm the reference is generated automatically by the database.
- [ ] Confirm the location token is `Barsha`.
- [ ] Confirm the day token is the two-digit day of month.
- [ ] Confirm the year is four digits and no month token appears.
- [ ] Correct the location token as Management and confirm the sequence does not change.
- [ ] Confirm the same shared reference appears on project, quotation, invoice, receipt, and PDFs where linked.

### Invoice

- [ ] Generate a Draft invoice from a project with a current approved quotation.
- [ ] Confirm customer, project, quotation, site, line items, discounts, VAT, notes, and terms are prefilled from snapshots.
- [ ] Adjust Draft values and save; verify totals.
- [ ] Issue the invoice and confirm commercial values are no longer editable.
- [ ] Open the PDF and confirm invoice number plus shared reference.
- [ ] Cancel a UAT invoice with a reason and confirm the audit record remains.

### Commercial Documents

- [ ] Search by internal number, shared reference, customer, project, or site.
- [ ] Confirm Quotations and Receipts reuse their existing verified records.
- [ ] Confirm Invoices opens the new invoice records.
- [ ] Confirm View and PDF actions open the intended record.

### PDF and branding

- [ ] Confirm the official client-supplied logo is not stretched or cropped.
- [ ] Confirm A4 layout, customer, project/site, dates, items, subtotal, discount, VAT, total, notes/terms, signatory, and company footer.
- [ ] Confirm quotation, invoice, and receipt PDFs look like one document family.

### Security

- [ ] Anonymous invoice table access is denied by RLS.
- [ ] Anonymous invoice PDF access redirects to application login.
- [ ] Sales and Site Team cannot open the invoice/document modules.
- [ ] Direct invoice mutations outside controlled RPCs are denied.
- [ ] Management/Admin and Accounts retain intended access.
- [ ] Private Storage policies remain unchanged.

### Responsive QA

- [ ] 390×844: cards replace wide tables and no page-level horizontal overflow appears.
- [ ] 1280×720: hub, invoice editor, and invoice detail remain fully operable.
- [ ] 1440×900: full-width tables and document actions remain legible.
- [ ] No application console errors occur.

Record feedback as `P0`, `P1`, `P2`, `P3`, or `NEW FEATURE`. Do not implement new features automatically during UAT review.
