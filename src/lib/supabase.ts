import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
});

export type Profile = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string | null;
  guardian_relationship: string | null;
  created_at: string;
};

export type Medicine = {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
};

export type LogStatus = 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';

export type MedLog = {
  id: string;
  medicine_id: string;
  scheduled_time: string;
  scheduled_date: string;
  status: LogStatus;
  confirmed_at: string | null;
  reminder_count: number;
  last_reminded_at: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  medicine_id: string | null;
  message: string;
  level: number;
  status: string;
  created_at: string;
};

export type LogWithMedicine = MedLog & { medicines: Pick<Medicine, 'id' | 'name' | 'dosage'> | null };
