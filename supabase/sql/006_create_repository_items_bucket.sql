insert into storage.buckets (id, name, public)
values ('repository-items', 'repository-items', false)
on conflict (id) do nothing;

drop policy if exists "Users can view their own repository files" on storage.objects;
drop policy if exists "Users can upload their own repository files" on storage.objects;
drop policy if exists "Users can delete their own repository files" on storage.objects;

create policy "Users can view their own repository files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'repository-items'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can upload their own repository files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'repository-items'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their own repository files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'repository-items'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
