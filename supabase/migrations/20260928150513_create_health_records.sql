/*
# Create health_records table and storage bucket

1. New Tables
- `health_records`
- `id` (uuid, primary key)
- `title` (text, not null) — name of the record
- `category` (text, not null) — type: lab_report, prescription, scan, vitals, other
- `file_path` (text, not null) — storage path in health-records bucket
- `file_name` (text, not null) — original file name
- `file_type` (text, not null) — MIME type
- `notes` (text, nullable)
- `record_date` (date, not null, default today)
- `user_id` (uuid, not null, defaults to auth.uid()) — owner
- `created_at` (timestamptz, default now())

2. Storage
- Create a `health-records` private storage bucket
- Only authenticated users can upload/read/delete their own files

3. Security
- Enable RLS on `health_records`
- Owner-scoped CRUD: each authenticated user can only access their own records
- Storage policies: users manage their own files in the health-records bucket
*/

CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  notes text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_health_records" ON health_records;
CREATE POLICY "select_own_health_records" ON health_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_health_records" ON health_records;
CREATE POLICY "insert_own_health_records" ON health_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_health_records" ON health_records;
CREATE POLICY "update_own_health_records" ON health_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_health_records" ON health_records;
CREATE POLICY "delete_own_health_records" ON health_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('health-records', 'health-records', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own health files" ON storage.objects;
CREATE POLICY "Users can upload own health files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'health-records' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can read own health files" ON storage.objects;
CREATE POLICY "Users can read own health files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'health-records' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own health files" ON storage.objects;
CREATE POLICY "Users can delete own health files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'health-records' AND auth.uid() = owner);
