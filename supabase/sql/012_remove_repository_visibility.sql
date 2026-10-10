drop index if exists public.repositories_visibility_idx;

alter table public.repositories
drop column if exists visibility;
