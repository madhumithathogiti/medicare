import { supabase, type Profile, type Medicine, type MedLog, type LogWithMedicine, type NotificationItem, type LogStatus } from './supabase';
export { supabase };
import { istTodayStr } from './time';

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profile').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(p: Omit<Profile, 'id' | 'created_at'>): Promise<Profile> {
  const existing = await getProfile();
  if (existing) {
    const { data, error } = await supabase
      .from('profile')
      .update(p)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('profile').insert(p).select('*').single();
  if (error) throw error;
  return data;
}

export async function getMedicines(): Promise<Medicine[]> {
  const { data, error } = await supabase.from('medicines').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getMedicine(id: string): Promise<Medicine | null> {
  const { data, error } = await supabase.from('medicines').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMedicine(m: Omit<Medicine, 'id' | 'created_at'> & { id?: string }): Promise<Medicine> {
  if (m.id) {
    const { id, ...rest } = m;
    const { data, error } = await supabase.from('medicines').update(rest).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { id: _omit, ...rest } = m;
  void _omit;
  const { data, error } = await supabase.from('medicines').insert(rest).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteMedicine(id: string): Promise<void> {
  const { error } = await supabase.from('medicines').delete().eq('id', id);
  if (error) throw error;
}

export async function getLogsForDate(date: string): Promise<LogWithMedicine[]> {
  const { data, error } = await supabase
    .from('logs')
    .select('*, medicines(id, name, dosage)')
    .eq('scheduled_date', date)
    .order('scheduled_time', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLogsForDateRange(startDate: string, endDate: string): Promise<LogWithMedicine[]> {
  const { data, error } = await supabase
    .from('logs')
    .select('*, medicines(id, name, dosage)')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function ensureLogsForDate(date: string, medicines: Medicine[]): Promise<void> {
  const existing = await getLogsForDate(date);
  const existingKeys = new Set(existing.map((l) => `${l.medicine_id}|${l.scheduled_time}`));
  const toInsert: Array<{ medicine_id: string; scheduled_time: string; scheduled_date: string; status: LogStatus }> = [];
  for (const med of medicines) {
    if (med.end_date && med.end_date < date) continue;
    if (med.start_date > date) continue;
    for (const time of med.times) {
      const key = `${med.id}|${time}`;
      if (!existingKeys.has(key)) {
        toInsert.push({ medicine_id: med.id, scheduled_time: time, scheduled_date: date, status: 'PENDING' });
      }
    }
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from('logs').insert(toInsert);
    if (error) throw error;
  }
}

export async function markLogTaken(logId: string): Promise<{ alreadyTaken: boolean }> {
  const { data: existing, error: checkErr } = await supabase
    .from('logs')
    .select('status')
    .eq('id', logId)
    .maybeSingle();
  if (checkErr) throw checkErr;
  if (existing?.status === 'TAKEN') return { alreadyTaken: true };

  const { error } = await supabase
    .from('logs')
    .update({ status: 'TAKEN', confirmed_at: new Date().toISOString() })
    .eq('id', logId);
  if (error) throw error;
  return { alreadyTaken: false };
}

export async function markLogSkipped(logId: string): Promise<void> {
  const { error } = await supabase
    .from('logs')
    .update({ status: 'SKIPPED', confirmed_at: new Date().toISOString() })
    .eq('id', logId);
  if (error) throw error;
}

export async function markLogMissed(logId: string): Promise<void> {
  const { error } = await supabase
    .from('logs')
    .update({ status: 'MISSED' })
    .eq('id', logId);
  if (error) throw error;
}

export async function incrementReminder(logId: string): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from('logs')
    .select('reminder_count')
    .eq('id', logId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  const count = (data?.reminder_count ?? 0) + 1;
  const { error } = await supabase
    .from('logs')
    .update({ reminder_count: count, last_reminded_at: new Date().toISOString() })
    .eq('id', logId);
  if (error) throw error;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function addNotification(n: Omit<NotificationItem, 'id' | 'created_at'>): Promise<NotificationItem | null> {
  const { data, error } = await supabase.from('notifications').insert(n).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function sendGuardianEmail(notificationId?: string): Promise<void> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-guardian-email`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ notificationId }),
    });
    if (!res.ok) console.error('Guardian email edge function returned non-OK:', res.status);
  } catch (e) {
    console.error('Failed to send guardian email:', e);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ status: 'READ' }).eq('id', id);
  if (error) throw error;
}

export async function getTodayLogs(): Promise<LogWithMedicine[]> {
  return getLogsForDate(istTodayStr());
}
