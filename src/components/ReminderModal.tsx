import { useEffect, useRef, useState } from 'react';
import { Pill, Clock, CheckCircle, X, AlertCircle, Volume2, VolumeX, BellOff } from 'lucide-react';
import { markLogTaken, markLogSkipped, snoozeLog } from '@/lib/db';
import { formatTime12 } from '@/lib/time';
import type { ActiveReminder } from '@/hooks/useReminderEngine';
import { useI18n } from '@/lib/i18n-context';

type Props = {
  reminder: ActiveReminder | null;
  onClose: () => void;
  onTaken: (alreadyTaken: boolean) => void;
  onSkip: () => void;
  onSnooze: () => void;
};

function useAlarm(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
      return;
    }

    try {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return; }

    const playBeep = () => {
      const ctx = ctxRef.current;
      if (!ctx || muted) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    };

    playBeep();
    intervalRef.current = setInterval(playBeep, 2000);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
    };
  }, [active, muted]);

  return { muted, setMuted };
}

export function ReminderModal({ reminder, onClose, onTaken, onSkip, onSnooze }: Props) {
  const { t } = useI18n();
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { muted, setMuted } = useAlarm(!!reminder);

  useEffect(() => {
    setAlreadyTaken(false);
    setProcessing(false);
  }, [reminder]);

  if (!reminder) return null;

  const handleTaken = async () => {
    if (!reminder) return;
    setProcessing(true);
    try {
      const { alreadyTaken: dup } = await markLogTaken(reminder.logId);
      if (dup) {
        setAlreadyTaken(true);
      } else {
        onTaken(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!reminder) return;
    setProcessing(true);
    try {
      await markLogSkipped(reminder.logId);
      onSkip();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const [snoozing, setSnoozing] = useState(false);
  const handleSnooze = async () => {
    if (!reminder) return;
    setSnoozing(true);
    try {
      await snoozeLog(reminder.logId, 5);
      onSnooze();
    } catch (e) {
      console.error(e);
    } finally {
      setSnoozing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('medicineReminder')}</h2>
              <p className="text-teal-50 text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {formatTime12(reminder.scheduledTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMuted((m) => !m)} className="text-white/80 hover:text-white transition-colors p-1" title={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {alreadyTaken ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-9 h-9 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{t('alreadyRecorded')}</h3>
              <p className="text-slate-500 mb-6">
                {t('alreadyRecordedDesc')}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
              >
                {t('close')}
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-11 h-11 text-teal-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">{reminder.medicineName}</h3>
                <p className="text-slate-500">{reminder.dosage}</p>
                {reminder.reminderCount > 0 && (
                  <p className="mt-3 inline-block text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">
                    {t('reminderNum')} #{reminder.reminderCount + 1}
                  </p>
                )}
              </div>

              <p className="text-center text-slate-600 mb-6 text-lg">{t('haveYouTaken')}</p>

              <div className="space-y-3">
                <button
                  onClick={handleTaken}
                  disabled={processing}
                  className="w-full py-4 rounded-xl bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-6 h-6" />
                  {t('yesTookIt')}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    disabled={processing}
                    className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {t('remindMeAgain')}
                  </button>
                  <button
                    onClick={handleSnooze}
                    disabled={snoozing}
                    className="flex-1 py-3.5 rounded-xl bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <BellOff className="w-5 h-5" />
                    {t('snooze')} 5m
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
