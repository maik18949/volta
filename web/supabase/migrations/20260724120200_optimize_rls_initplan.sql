-- web/supabase/migrations/20260724120200_optimize_rls_initplan.sql

alter policy "properties_owner" on properties
  using ((select auth.uid()) = user_id);

alter policy "status_entries_owner" on status_entries
  using (property_id in (select id from properties where user_id = (select auth.uid())));

alter policy "extraordinary_costs_owner" on extraordinary_costs
  using (property_id in (select id from properties where user_id = (select auth.uid())));

alter policy "property_photos_owner" on property_photos
  using (property_id in (select id from properties where user_id = (select auth.uid())));
