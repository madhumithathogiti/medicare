/*
# Medication Reminder & Guardian Alert System — Schema

## Purpose
Single-tenant prototype: one elderly person + one guardian per installation.
No sign-in screen, so the anon-key frontend reads/writes as `anon`.

## New Tables

1. `profile` — the elderly person + guardian contact info (one row)
   - id (uuid pk)
   - name, age, phone, email — elderly person
   - guardian_name, guardian_phone, guardian_email, guardian_relationship
   - created_at

2. `medicines` — each medicine/tablet prescribed
   - id (uuid pk)
   - name (text)
   - dosage (text, e.g. "500 mg")
   - times (text[] — array of "HH:MM" scheduled times, e.g. {"08:00","20:00"})
   - start_date (date)
   - end_date (date, nullable = ongoing)
   - notes (text, nullable)
   - created_at

3. `logs` — one row per scheduled dose per day (the MedicineLog)
   - id (uuid pk)
   - medicine_id (uuid fk -> medicines)
   - scheduled_time (text "HH:MM")
   - scheduled_date (date)
   - status (text: PENDING | TAKEN | MISSED | SKIPPED)
   - confirmed_at (timestamptz, nullable)
   - reminder_count (int, default 0 — how many reminders shown)
   - last_reminded_at (timestamptz, nullable)
   - created_at
   - UNIQUE (medicine_id, scheduled_time, scheduled_date)

4. `notifications` — guardian alert log
   - id (uuid pk)
   - medicine_id (uuid fk -> medicines, nullable)
   - message (text)
   - level (int — 1/2/3 escalation)
   - status (text: SENT | READ)
   - created_at

## Security
- RLS enabled on all tables.
- All policies `TO anon, authenticated` with `USING (true)` — intentionally public/shared single-tenant data.
*/

CREATE TABLE IF NOT EXISTS profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age int NOT NULL,
  phone text NOT NULL,
  email text,
  guardian_name text NOT NULL,
  guardian_phone text NOT NULL,
  guardian_email text,
  guardian_relationship text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_profile" ON profile;
CREATE POLICY "anon_select_profile" ON profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profile" ON profile;
CREATE POLICY "anon_insert_profile" ON profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profile" ON profile;
CREATE POLICY "anon_update_profile" ON profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profile" ON profile;
CREATE POLICY "anon_delete_profile" ON profile FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dosage text NOT NULL,
  times text[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_medicines" ON medicines;
CREATE POLICY "anon_select_medicines" ON medicines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_medicines" ON medicines;
CREATE POLICY "anon_insert_medicines" ON medicines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_medicines" ON medicines;
CREATE POLICY "anon_update_medicines" ON medicines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_medicines" ON medicines;
CREATE POLICY "anon_delete_medicines" ON medicines FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  scheduled_time text NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  confirmed_at timestamptz,
  reminder_count int NOT NULL DEFAULT 0,
  last_reminded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (medicine_id, scheduled_time, scheduled_date)
);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_logs" ON logs;
CREATE POLICY "anon_select_logs" ON logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_logs" ON logs;
CREATE POLICY "anon_insert_logs" ON logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_logs" ON logs;
CREATE POLICY "anon_update_logs" ON logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_logs" ON logs;
CREATE POLICY "anon_delete_logs" ON logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid REFERENCES medicines(id) ON DELETE SET NULL,
  message text NOT NULL,
  level int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'SENT',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);