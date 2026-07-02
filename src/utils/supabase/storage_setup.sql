-- Storage configuration for ABES Connect profile pictures.
-- Paste this script into your Supabase SQL Editor.

-- 1. Create a storage bucket called "avatars" if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Row Level Security (RLS) is already enabled on storage.objects by default in Supabase.
-- You do not need to run ALTER TABLE on it (doing so throws a permission error).

-- 3. Configure RLS Policies for avatars bucket

-- Allow public read access to avatars
create policy "Public Access to Avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar files
create policy "Authenticated Users Upload Avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar files
create policy "Users Update Their Own Avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar files
create policy "Users Delete Their Own Avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );
