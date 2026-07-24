-- web/supabase/migrations/20260724120100_properties_user_id_index.sql

create index properties_user_id_idx on properties (user_id);
