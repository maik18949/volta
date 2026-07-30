-- web/supabase/migrations/20260727130000_property_photos_storage.sql

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do nothing;

-- Path convention: <property_id>/<uuid>.<ext> — storage.foldername(name) splits on '/'
-- and returns an array of path segments, so [1] is the property_id folder.
create policy "property_photos_storage_select" on storage.objects for select using (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] in (select id::text from properties where user_id = (select auth.uid()))
);

create policy "property_photos_storage_insert" on storage.objects for insert with check (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] in (select id::text from properties where user_id = (select auth.uid()))
);

create policy "property_photos_storage_delete" on storage.objects for delete using (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] in (select id::text from properties where user_id = (select auth.uid()))
);
