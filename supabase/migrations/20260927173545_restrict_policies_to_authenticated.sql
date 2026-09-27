/*
# Restrict RLS policies to authenticated users only

## Purpose
The app now has a login screen (Supabase email/password auth).
Previously all policies allowed `anon, authenticated` because there was no sign-in.
Now only signed-in users should be able to read/write data.

## Changes
- Drop and recreate all CRUD policies on `profile`, `medicines`, `logs`, and `notifications` tables.
- All policies now use `TO authenticated` with `USING (true)` / `WITH CHECK (true)` 
  because the data is intentionally shared between the patient and guardian 
  (single-tenant shared data model — both roles use the same data).

## Security
- `anon` role loses all access — unauthenticated requests return no rows.
- `authenticated` role retains full CRUD on all tables (shared data).
- RLS remains enabled on all tables.
*/

-- profile
DROP POLICY IF EXISTS "anon_select_profile" ON profile;
CREATE POLICY "auth_select_profile" ON profile FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profile" ON profile;
CREATE POLICY "auth_insert_profile" ON profile FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profile" ON profile;
CREATE POLICY "auth_update_profile" ON profile FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profile" ON profile;
CREATE POLICY "auth_delete_profile" ON profile FOR DELETE TO authenticated USING (true);

-- medicines
DROP POLICY IF EXISTS "anon_select_medicines" ON medicines;
CREATE POLICY "auth_select_medicines" ON medicines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_medicines" ON medicines;
CREATE POLICY "auth_insert_medicines" ON medicines FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_medicines" ON medicines;
CREATE POLICY "auth_update_medicines" ON medicines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_medicines" ON medicines;
CREATE POLICY "auth_delete_medicines" ON medicines FOR DELETE TO authenticated USING (true);

-- logs
DROP POLICY IF EXISTS "anon_select_logs" ON logs;
CREATE POLICY "auth_select_logs" ON logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_logs" ON logs;
CREATE POLICY "auth_insert_logs" ON logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_logs" ON logs;
CREATE POLICY "auth_update_logs" ON logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_logs" ON logs;
CREATE POLICY "auth_delete_logs" ON logs FOR DELETE TO authenticated USING (true);

-- notifications
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "auth_select_notifications" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);
