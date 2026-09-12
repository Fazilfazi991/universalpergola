# Assumptions requiring confirmation

1. Staff accounts are invite/admin-created only. Self-service sign-up is disabled.
2. The first Auth user receives the default `sales` role and must be promoted to `admin` through a trusted SQL/admin workflow during initial setup.
3. AED is the default currency and 5% is the initial quotation VAT rate; both remain stored per record.
4. Sales users may see all customers, enquiries, quotations, and projects. Site Team access is assignment-scoped. Accounts may see all projects but only finance users and management can modify payments.
5. Product and category publishing is management-only in the initial permission matrix. Sales has read access to the catalogue.
6. Project stage templates are seeded with the requested defaults but are editable data, not hardcoded workflow logic.
7. Uploaded product images are public catalogue assets. Site photos, project files, and payment proofs are private.
8. Customer-facing enquiry fields, quotation numbering, project numbering, document branding, and notification channels will be confirmed before Phase 2 CRUD work.
9. Category images use a dedicated private `category-images` bucket; product images remain in `product-images`.
10. Catalogue pages prioritize immediate publication consistency and signed-media correctness, so they remain dynamically rendered until hosted traffic patterns justify tagged caching.
11. The temporary `/dev/phase2a` fixture preview is available only under `next dev`, is inert, and must never be used as a production data source.
12. Hosted migration, RLS, Auth, Storage, and real CRUD acceptance remain pending until a dedicated Universal Pergola Supabase project is created.
