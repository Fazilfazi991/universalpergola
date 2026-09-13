-- Cover the Phase 2B foreign keys reported by the hosted Performance Advisor.
create index if not exists customers_created_by_idx
  on public.customers(created_by)
  where created_by is not null;

create index if not exists enquiries_created_by_idx
  on public.enquiries(created_by)
  where created_by is not null;

create index if not exists enquiries_product_idx
  on public.enquiries(product_id)
  where product_id is not null;

create index if not exists enquiry_activities_created_by_idx
  on public.enquiry_activities(created_by)
  where created_by is not null;
