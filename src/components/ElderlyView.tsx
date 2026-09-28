import { useState } from 'react';
import { Pill, Clock, CheckCircle, XCircle, AlertCircle, Bell, CalendarDays, Check, X } from 'lucide-react';
import type { LogWithMedicine, Profile, Medicine } from '@/lib/supabase';
import { formatTime12, minutesAhead, formatDate, istTodayStr } from '@/lib/time';
import { MedicineManager } from './MedicineManager';
import { HealthRecords } from './HealthRecords';
import { getLogsForDateRange, markLogTaken, markLogSkipped } from '@/lib/db';
import { useI18n } from '@/lib/i18n-context';

type Props = {
  profile: Profile;
  medicines: Medicine[];
  todayLogs: LogWithMedicine[];
  onMedicinesChanged: () => void;
  onOpenReminder: (logId: string) => void;
  onRefresh: () => void;
};

type Tab = 'today' | 'medicines' | 'calendar' | 'records';

export function ElderlyView({ profile, medicines, todayLogs, onMedicinesChanged, onOpenReminder, onRefresh }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('today');

  const tabs: Array<{ id: Tab; label: string; icon: typeof Pill }> = [
    { id: 'today', label: t('today'), icon: Pill },
    { id: 'medicines', label: t('medicines'), icon: Pill },
    { id: 'calendar', label: t('calendar'), icon: CalendarDays },
    { id: 'records', label: t('healthRecords'), icon: Pill },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between pr-44">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">{t('appTitle')}</h1>
              <p className="text-xs text-slate-400">{t('hello')}, {profile.name}</p>
            </div>
          </div>
          <button onClick={onRefresh} className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title={t('refresh')}>
            <Bell className="w-5 h-5" />
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1">
          {tabs.map((t2) => (
            <button
              key={t2.id}
              onClick={() => setTab(t2.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t2.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <t2.icon className="w-4 h-4" /> {t2.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {tab === 'today' && <TodayView logs={todayLogs} onOpenReminder={onOpenReminder} />}
        {tab === 'medicines' && <MedicineManager medicines={medicines} onSaved={onMedicinesChanged} onDeleted={onMedicinesChanged} />}
        {tab === 'calendar' && <CalendarView medicines={medicines} onRefresh={onRefresh} />}
        {tab === 'records' && <HealthRecords />}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
    PENDING: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100', label: t('upcoming') },
    TAKEN: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: t('taken') },
    MISSED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: t('missed') },
    SKIPPED: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: t('skipped') },
  };
  const c = config[status] ?? config.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.color}`}>
      <c.icon className="w-3.5 h-3.5" /> {c.label}
    </span>
  );
}

function TodayView({ logs, onOpenReminder }: { logs: LogWithMedicine[]; onOpenReminder: (logId: string) => void }) {
  const { t } = useI18n();
  const taken = logs.filter((l) => l.status === 'TAKEN').length;
  const missed = logs.filter((l) => l.status === 'MISSED').length;
  const total = logs.length;
  const pending = total - taken - missed;

  if (total === 0) {
    return (
      <div className="text-center py-20">
        <Pill className="w-14 h-14 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600">{t('noScheduled')}</h3>
        <p className="text-slate-400 text-sm mt-1">{t('noScheduledHint')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label={t('taken')} value={taken} color="green" />
        <StatCard label={t('pending')} value={pending} color="slate" />
        <StatCard label={t('missed')} value={missed} color="red" />
      </div>

      <h2 className="text-lg font-bold text-slate-800 mb-3">{formatDate(istTodayStr())}</h2>

      <div className="space-y-3">
        {logs.map((log) => {
          const isDue = log.status === 'PENDING' && minutesAhead(log.scheduled_time) <= 0;
          return (
            <div
              key={log.id}
              className={`bg-white rounded-2xl border p-4 transition-all ${
                isDue ? 'border-teal-300 shadow-md ring-1 ring-teal-200 animate-pulseRing' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    log.status === 'TAKEN' ? 'bg-green-50' : log.status === 'MISSED' ? 'bg-red-50' : 'bg-slate-100'
                  }`}>
                    <Pill className={`w-6 h-6 ${
                      log.status === 'TAKEN' ? 'text-green-600' : log.status === 'MISSED' ? 'text-red-500' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{log.medicines?.name ?? 'Unknown'}</h3>
                    <p className="text-sm text-slate-500">{log.medicines?.dosage} · {formatTime12(log.scheduled_time)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={log.status} />
                  {isDue && (
                    <button
                      onClick={() => onOpenReminder(log.id)}
                      className="text-sm font-semibold text-teal-600 hover:text-teal-700 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors"
                    >
                      {t('takeNow')}
                    </button>
                  )}
                </div>
              </div>
              {log.confirmed_at && (
                <p className="text-xs text-slate-400 mt-2">{t('confirmedAt')} {new Date(log.confirmed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'green' | 'slate' | 'red' }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className={`rounded-2xl p-4 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
}

function CalendarView({ medicines, onRefresh }: { medicines: Medicine[]; onRefresh: () => void }) {
  const { t } = useI18n();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [dayLogs, setDayLogs] = useState<Record<string, LogWithMedicine[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadMonth = async (y: number, m: number) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

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
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">{monthName}</h2>
          <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">←</button>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">→</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: numDays }).map((_, i) => {
            const day = i + 1;
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = getDayStatus(date);
            const isToday = date === today;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(date)}
                className={`aspect-square rounded-lg border text-sm font-medium transition-all hover:scale-105 ${
                  statusColors[status]
                } ${isToday ? 'ring-2 ring-teal-500' : ''} ${selectedDay === date ? 'ring-2 ring-teal-600' : ''}`}
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
          <h3 className="font-bold text-slate-800 mb-3">{formatDate(selectedDay)}</h3>
          {selectedLogs.length === 0 ? (
            <p className="text-slate-400 text-sm">{t('noScheduledOnDay')}</p>
          ) : (
            <div className="space-y-2">
              {selectedLogs.map((log) => (
                <div key={log.id} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{log.medicines?.name}</span>
                      <span className="text-sm text-slate-400">· {formatTime12(log.scheduled_time)}</span>
                    </div>
                    <StatusBadge status={log.status} />
                  </div>
                  {log.status === 'PENDING' && (
                    <div className="flex gap-2 mt-2 ml-6">
                      <button
                        onClick={async () => { await markLogTaken(log.id); onRefresh(); loadMonth(year, month); }}
                        className="flex items-center gap-1 text-xs font-semibold text-green-600 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> {t('markTaken')}
                      </button>
                      <button
                        onClick={async () => { await markLogSkipped(log.id); onRefresh(); loadMonth(year, month); }}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> {t('markSkipped')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <p className="text-center text-slate-400 text-sm mt-4">{t('loading')}</p>}
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
