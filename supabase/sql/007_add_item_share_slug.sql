alter table public.items
add column if not exists share_slug text;

create unique index if not exists items_share_slug_key
on public.items (share_slug)
where share_slug is not null;
