import { useState, useEffect, useCallback } from 'react';
import { Pill, Shield, Heart, Globe, Clock, LogOut } from 'lucide-react';
import { supabase, getProfile, getLogsForDate, markLogTaken } from '@/lib/db';
import type { Profile, LogWithMedicine } from '@/lib/supabase';
import { istTodayStr, istTimeStr, istFullDate } from '@/lib/time';
import { ProfileSetup } from '@/components/ProfileSetup';
import { ElderlyView } from '@/components/ElderlyView';
import { GuardianView } from '@/components/GuardianView';
import { ReminderModal } from '@/components/ReminderModal';
import { AuthPage } from '@/components/AuthPage';
import type { ActiveReminder } from '@/hooks/useReminderEngine';
import { useReminderEngine } from '@/hooks/useReminderEngine';
import { I18nProvider, useI18n, LANGS } from '@/lib/i18n-context';
import type { Lang } from '@/lib/i18n';

type Role = 'elderly' | 'guardian';

function AppInner() {
  const { lang, setLang, t } = useI18n();
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>('elderly');
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [reminderQueue, setReminderQueue] = useState<ActiveReminder[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [clock, setClock] = useState({ time: istTimeStr(), date: istFullDate() });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setClock({ time: istTimeStr(), date: istFullDate() });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onReminder = useCallback((r: ActiveReminder) => {
    setReminderQueue((q) => {
      if (q.some((x) => x.logId === r.logId)) return q;
      return [...q, r];
    });
  }, []);

  const { medicines, todayLogs, refresh } = useReminderEngine(onReminder, lang);

  useEffect(() => {
    if (reminderQueue.length > 0 && !activeReminder) {
      setActiveReminder(reminderQueue[0]);
    }
  }, [reminderQueue, activeReminder]);

  const closeReminder = useCallback(() => {
    setActiveReminder(null);
    setReminderQueue((q) => q.slice(1));
  }, []);

  const handleTaken = useCallback((_alreadyTaken: boolean) => {
    closeReminder();
    refresh();
    setRefreshTick((t) => t + 1);
  }, [closeReminder, refresh]);

  const handleSkip = useCallback(() => {
    closeReminder();
    setRefreshTick((t) => t + 1);
  }, [closeReminder]);

  const handleOpenReminder = useCallback(async (logId: string) => {
    const logs = await getLogsForDate(istTodayStr());
    const log = logs.find((l) => l.id === logId);
    if (log) {
      setActiveReminder({
        logId: log.id,
        medicineName: log.medicines?.name ?? 'Unknown',
        dosage: log.medicines?.dosage ?? '',
        scheduledTime: log.scheduled_time,
        reminderCount: log.reminder_count,
      });
    }
  }, []);

  const handleMedicinesChanged = useCallback(() => {
    refresh();
    setRefreshTick((t) => t + 1);
  }, [refresh]);

  const handleProfileSaved = useCallback(() => {
    loadProfile();
    refresh();
  }, [loadProfile, refresh]);

  void refreshTick;
  void markLogTaken;

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart className="w-9 h-9 text-white" />
          </div>
          <p className="text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (!profile) {
    return <ProfileSetup existing={null} onSaved={handleProfileSaved} />;
  }

  return (
    <div className="relative">
      {/* Top-right unified control panel */}
      <div className="fixed top-3 right-3 z-50">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          {/* Row 1: Role toggle */}
          <div className="flex gap-1 p-1.5 border-b border-slate-100 rounded-t-2xl">
            <button
              onClick={() => setRole('elderly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === 'elderly' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Pill className="w-3.5 h-3.5" /> {t('patient')}
            </button>
            <button
              onClick={() => setRole('guardian')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === 'guardian' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> {t('guardian')}
            </button>
          </div>

          {/* Row 2: IST Clock */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm tabular-nums">
              <Clock className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              {clock.time}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{clock.date}</p>
          </div>

          {/* Row 3: Language selector */}
          <div className="relative border-b border-slate-100">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              {LANGS.find((l) => l.code === lang)?.native ?? 'English'}
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute top-full mt-1 right-0 left-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-fadeIn">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                        lang === l.code ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {l.native}
                      {lang === l.code && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Row 4: Logout */}
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors rounded-b-2xl"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Main content */}
      {role === 'elderly' ? (
        <ElderlyView
          profile={profile}
          medicines={medicines}
          todayLogs={todayLogs}
          onMedicinesChanged={handleMedicinesChanged}
          onOpenReminder={handleOpenReminder}
          onRefresh={refresh}
        />
      ) : (
        <GuardianView profile={profile} onRefresh={refresh} />
      )}

      <ReminderModal
        reminder={activeReminder}
        onClose={closeReminder}
        onTaken={handleTaken}
        onSkip={handleSkip}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
