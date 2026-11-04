-- Keep the new enum value in its own migration so following migrations can use it safely.
alter type public.app_role add value if not exists 'investor';
