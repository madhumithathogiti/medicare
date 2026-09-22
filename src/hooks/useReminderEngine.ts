import { useEffect, useRef, useState, useCallback } from 'react';
import type { LogWithMedicine, Medicine } from '@/lib/supabase';
import { getMedicines, getProfile, getLogsForDate, ensureLogsForDate, markLogMissed, incrementReminder, addNotification } from '@/lib/db';
import { istTodayStr, istNowMinutes, timeToMinutes } from '@/lib/time';
import type { Lang, TFunc } from '@/lib/i18n';
import { makeT } from '@/lib/i18n';

const MISS_AFTER = 30;

export type ActiveReminder = {
  logId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  reminderCount: number;
};

type ReminderState = {
  activeReminders: ActiveReminder[];
  dismissed: Set<string>;
};

function buildMessage(level: number, t: TFunc, profileName: string, medName: string, scheduledTime: string): { message: string; level: number } {
  if (level <= 1) {
    return { message: `${profileName} ${t('firstReminder')} ${medName} (${scheduledTime}).`, level: 1 };
  }
  if (level === 2) {
    return { message: `${profileName} ${t('secondReminder')} ${medName} (${scheduledTime}).`, level: 2 };
  }
  return { message: `${t('missedDoseAlert')}: ${profileName} ${t('patientMissedAlert')} ${medName} (${scheduledTime}). ${t('pleaseFollowUp')}`, level: 3 };
}

export function useReminderEngine(onReminder: (r: ActiveReminder) => void, lang: Lang) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todayLogs, setTodayLogs] = useState<LogWithMedicine[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const notifiedRef = useRef<Set<string>>(new Set());
  const dismissedRef = useRef<Set<string>>(new Set());
  const [state, setState] = useState<ReminderState>({ activeReminders: [], dismissed: new Set() });
  const langRef = useRef(lang);
  langRef.current = lang;

  const refresh = useCallback(async () => {
    const today = istTodayStr();
    const meds = await getMedicines();
    setMedicines(meds);
    await ensureLogsForDate(today, meds);
    const logs = await getLogsForDate(today);
    setTodayLogs(logs);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const checkAndEscalate = useCallback(async () => {
    const t = makeT(langRef.current);
    const today = istTodayStr();
    const meds = await getMedicines();
    await ensureLogsForDate(today, meds);
    const logs = await getLogsForDate(today);
    setTodayLogs(logs);

    const now = istNowMinutes();
    const newActive: ActiveReminder[] = [];

    for (const log of logs) {
      if (log.status !== 'PENDING') continue;
      const scheduledMin = timeToMinutes(log.scheduled_time);
      const elapsed = now - scheduledMin;
      if (elapsed < 0) continue;

      const reminderStage = Math.min(Math.floor(elapsed / 10), 3);
      const logKey = `${log.id}`;

      // Missed after 30 minutes
      if (elapsed >= MISS_AFTER) {
        // Mark as missed in DB
        await markLogMissed(log.id);
        // Create guardian notification (only once per log)
        if (!notifiedRef.current.has(`${logKey}-missed`)) {
          notifiedRef.current.add(`${logKey}-missed`);
          const profileName = (await getProfile())?.name ?? 'Patient';
          const msg = buildMessage(3, t, profileName, log.medicines?.name ?? 'medicine', log.scheduled_time);
          await addNotification({ medicine_id: log.medicine_id, message: msg.message, level: msg.level, status: 'SENT' });
        }
        continue;
      }

      // Escalation reminders at 10 and 20 minutes
      if (reminderStage > log.reminder_count && !notifiedRef.current.has(`${logKey}-${reminderStage}`)) {
        notifiedRef.current.add(`${logKey}-${reminderStage}`);
        await incrementReminder(log.id);
        if (reminderStage >= 1) {
          const profileName = (await getProfile())?.name ?? 'Patient';
          const msg = buildMessage(reminderStage, t, profileName, log.medicines?.name ?? 'medicine', log.scheduled_time);
          await addNotification({ medicine_id: log.medicine_id, message: msg.message, level: msg.level, status: 'SENT' });
        }
      }

      if (!dismissedRef.current.has(logKey)) {
        newActive.push({
          logId: log.id,
          medicineName: log.medicines?.name ?? 'Unknown',
          dosage: log.medicines?.dosage ?? '',
          scheduledTime: log.scheduled_time,
          reminderCount: log.reminder_count,
        });
      }
    }

    setState({ activeReminders: newActive, dismissed: dismissedRef.current });

    const firstNew = newActive.find((r) => !dismissedRef.current.has(r.logId));
    if (firstNew) {
      onReminder(firstNew);
    }
  }, [onReminder]);

  useEffect(() => {
    // Run immediately on mount
    checkAndEscalate().catch(console.error);
    const interval = setInterval(() => {
      checkAndEscalate().catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, [checkAndEscalate]);

  const dismissReminder = useCallback((logId: string) => {
    dismissedRef.current.add(logId);
    setState((s) => ({ ...s, dismissed: dismissedRef.current }));
  }, []);

  return { medicines, todayLogs, refresh, refreshKey, state, dismissReminder };
}
