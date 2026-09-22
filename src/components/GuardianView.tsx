import { useState, useEffect, useCallback } from 'react';
import { Shield, Phone, Mail, Bell, CalendarDays, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Pill, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Profile, LogWithMedicine, NotificationItem, Medicine } from '@/lib/supabase';
import { getNotifications, markNotificationRead, getLogsForDateRange, getMedicines } from '@/lib/db';
import { formatTime12, formatDate, istTodayStr, formatDateTimeIST } from '@/lib/time';
import { useI18n } from '@/lib/i18n-context';

type Props = {
  profile: Profile;
  onRefresh: () => void;
};

type Tab = 'dashboard' | 'calendar' | 'alerts';

export function GuardianView({ profile, onRefresh }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [logs, setLogs] = useState<LogWithMedicine[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = istTodayStr();
      const [todayLogs, meds, notifs] = await Promise.all([
        getLogsForDateRange(today, today),
        getMedicines(),
        getNotifications(),
      ]);
      setLogs(todayLogs);
      setMedicines(meds);
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount = notifications.filter((n) => n.status === 'SENT').length;

  const tabs: Array<{ id: Tab; label: string; icon: typeof Shield; badge?: number }> = [
    { id: 'dashboard', label: t('dashboard'), icon: TrendingUp },
    { id: 'calendar', label: t('calendar'), icon: CalendarDays },
    { id: 'alerts', label: t('alerts'), icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between pr-44">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">{t('guardian')} {t('dashboard')}</h1>
              <p className="text-xs text-slate-400">{t('monitoring')} {profile.name}</p>
            </div>
          </div>
          <button onClick={() => { onRefresh(); load(); }} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title={t('refresh')}>
            <Bell className="w-5 h-5" />
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1">
          {tabs.map((t2) => (
            <button
              key={t2.id}
              onClick={() => setTab(t2.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                tab === t2.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <t2.icon className="w-4 h-4" /> {t2.label}
              {t2.badge ? (
                <span className="absolute top-1 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{t2.badge}</span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <p className="text-center text-slate-400 py-20">{t('loading')}</p>
        ) : (
          <>
            {tab === 'dashboard' && <DashboardTab profile={profile} logs={logs} medicines={medicines} />}
            {tab === 'calendar' && <GuardianCalendar medicines={medicines} />}
            {tab === 'alerts' && <AlertsTab notifications={notifications} onRead={markNotificationRead} onRefresh={load} />}
          </>
        )}
      </main>
    </div>
  );
}

function DashboardTab({ profile, logs, medicines }: { profile: Profile; logs: LogWithMedicine[]; medicines: Medicine[] }) {
  const { t } = useI18n();
  const taken = logs.filter((l) => l.status === 'TAKEN').length;
  const missed = logs.filter((l) => l.status === 'MISSED').length;
  const total = logs.length;
  const pending = total - taken - missed;
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Pill className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-indigo-100 text-sm">{profile.age} {t('yearsOld')} · {medicines.length} {t('medicines')}</p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold">{adherence}%</p>
          <p className="text-indigo-100 text-sm mb-1">{t('adherenceToday')}</p>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${adherence}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <GuardianStat label={t('taken')} value={taken} icon={CheckCircle} color="text-green-600" bg="bg-green-50" />
        <GuardianStat label={t('pending')} value={pending} icon={Clock} color="text-slate-500" bg="bg-slate-100" />
        <GuardianStat label={t('missed')} value={missed} icon={XCircle} color="text-red-500" bg="bg-red-50" />
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-3">{t('todaysSchedule')}</h3>
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{t('noMedsScheduled')}</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    log.status === 'TAKEN' ? 'bg-green-50' : log.status === 'MISSED' ? 'bg-red-50' : 'bg-slate-100'
                  }`}>
                    <Pill className={`w-5 h-5 ${
                      log.status === 'TAKEN' ? 'text-green-600' : log.status === 'MISSED' ? 'text-red-500' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{log.medicines?.name}</h4>
                    <p className="text-xs text-slate-500">{log.medicines?.dosage} · {formatTime12(log.scheduled_time)}</p>
                  </div>
                </div>
                <GuardianStatusBadge status={log.status} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-3">{t('contact')}</h3>
        <div className="space-y-2">
          <a href={`tel:${profile.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Phone className="w-5 h-5 text-slate-400" />
            <span className="text-slate-700 font-medium">{profile.phone}</span>
          </a>
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <Mail className="w-5 h-5 text-slate-400" />
              <span className="text-slate-700 font-medium">{profile.email}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function GuardianStat({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: typeof CheckCircle; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  );
}

function GuardianStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { color: string; bg: string; label: string }> = {
    PENDING: { color: 'text-slate-500', bg: 'bg-slate-100', label: t('pending') },
    TAKEN: { color: 'text-green-600', bg: 'bg-green-50', label: t('taken') },
    MISSED: { color: 'text-red-500', bg: 'bg-red-50', label: t('missed') },
    SKIPPED: { color: 'text-amber-500', bg: 'bg-amber-50', label: t('skipped') },
  };
  const c = config[status] ?? config.PENDING;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.color}`}>{c.label}</span>;
}

function GuardianCalendar({ medicines }: { medicines: Medicine[] }) {
  const { t } = useI18n();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [dayLogs, setDayLogs] = useState<Record<string, LogWithMedicine[]>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadMonth = async (y: number, m: number) => {
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    try {
      const logs = await getLogsForDateRange(start, end);
      const grouped: Record<string, LogWithMedicine[]> = {};
      for (const log of logs) {
        if (!grouped[log.scheduled_date]) grouped[log.scheduled_date] = [];
        grouped[log.scheduled_date].push(log);
      }
      setDayLogs(grouped);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMonth(year, month);
  }, [year, month]);

  const changeMonth = (delta: number) => {
    let nm = month + delta;
    let ny = year;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11) { nm = 0; ny++; }
    setMonth(nm);
    setYear(ny);
    setSelectedDay(null);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = istTodayStr();

  const getDayStatus = (date: string): 'all' | 'partial' | 'missed' | 'none' | 'empty' => {
    const logs = dayLogs[date];
    if (!logs || logs.length === 0) return 'empty';
    const taken = logs.filter((l) => l.status === 'TAKEN').length;
    const missed = logs.filter((l) => l.status === 'MISSED').length;
    if (missed > 0) return 'missed';
    if (taken === logs.length) return 'all';
    if (taken > 0) return 'partial';
    return 'none';
  };

  const statusColors: Record<string, string> = {
    all: 'bg-green-100 text-green-700 border-green-300',
    partial: 'bg-amber-100 text-amber-700 border-amber-300',
    missed: 'bg-red-100 text-red-700 border-red-300',
    none: 'bg-slate-50 text-slate-400 border-slate-200',
    empty: 'bg-white text-slate-300 border-slate-100',
  };

  const selectedLogs = selectedDay ? dayLogs[selectedDay] ?? [] : [];
  const selectedTaken = selectedLogs.filter((l) => l.status === 'TAKEN').length;
  const selectedAdherence = selectedLogs.length > 0 ? Math.round((selectedTaken / selectedLogs.length) * 100) : 0;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">{monthLabel}</h2>
          <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: numDays }).map((_, i) => {
            const day = i + 1;
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = getDayStatus(date);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(date)}
                className={`aspect-square rounded-lg border text-sm font-medium transition-all hover:scale-105 ${statusColors[status]} ${date === today ? 'ring-2 ring-indigo-500' : ''} ${selectedDay === date ? 'ring-2 ring-indigo-600' : ''}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
          <Legend color="bg-green-200" label={t('allTaken')} />
          <Legend color="bg-amber-200" label={t('partial')} />
          <Legend color="bg-red-200" label={t('missed')} />
          <Legend color="bg-slate-200" label={t('pending')} />
        </div>
      </div>

      {selectedDay && (
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800">{formatDate(selectedDay)}</h3>
            {selectedLogs.length > 0 && (
              <span className="text-sm font-semibold text-indigo-600">{selectedAdherence}% {t('adherenceToday')}</span>
            )}
          </div>
          {selectedLogs.length === 0 ? (
            <p className="text-slate-400 text-sm">{t('noScheduledOnDay')}</p>
          ) : (
            <div className="space-y-2">
              {selectedLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">{log.medicines?.name}</span>
                    <span className="text-sm text-slate-400">· {formatTime12(log.scheduled_time)}</span>
                  </div>
                  <GuardianStatusBadge status={log.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertsTab({ notifications, onRead, onRefresh }: { notifications: NotificationItem[]; onRead: (id: string) => Promise<void>; onRefresh: () => void }) {
  const { t } = useI18n();
  const handleRead = async (id: string) => {
    await onRead(id);
    onRefresh();
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-3">{t('notifications')}</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">{t('noNotifications')}</p>
          <p className="text-slate-400 text-xs mt-1">{t('noNotificationsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 transition-all ${
                n.status === 'SENT' ? 'bg-white border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.level >= 3 ? 'bg-red-100' : n.level === 2 ? 'bg-amber-100' : 'bg-slate-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    n.level >= 3 ? 'text-red-500' : n.level === 2 ? 'text-amber-500' : 'text-slate-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      n.level >= 3 ? 'bg-red-100 text-red-600' : n.level === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {t('level')} {n.level}
                    </span>
                    {n.status === 'SENT' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                  <p className="text-sm text-slate-700">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDateTimeIST(n.created_at)}</p>
                </div>
                {n.status === 'SENT' && (
                  <button onClick={() => handleRead(n.id)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0">
                    {t('markRead')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span className="text-slate-500">{label}</span>
    </div>
  );
}
