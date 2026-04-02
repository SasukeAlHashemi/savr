alter table public.items
add column if not exists storage_path text,
add column if not exists file_name text,
add column if not exists mime_type text,
add column if not exists file_size_bytes bigint;
