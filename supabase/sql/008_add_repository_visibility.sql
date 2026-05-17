alter table public.repositories
add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'secret'));

update public.repositories
set visibility = 'public'
where visibility is null;

create index if not exists repositories_visibility_idx
on public.repositories (visibility);
