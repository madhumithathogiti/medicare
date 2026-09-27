import { useState, type FormEvent } from 'react';
import { Pill, Clock, Calendar, Plus, X, Trash2, Edit2, Save, AlertCircle, ScanLine } from 'lucide-react';
import { saveMedicine, deleteMedicine } from '@/lib/db';
import type { Medicine } from '@/lib/supabase';
import { formatTime12 } from '@/lib/time';
import { useI18n } from '@/lib/i18n-context';
import { MedicineScanner } from '@/components/MedicineScanner';

type Props = {
  medicines: Medicine[];
  onSaved: () => void;
  onDeleted: () => void;
};

export function MedicineManager({ medicines, onSaved, onDeleted }: Props) {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    dosage: '',
    times: ['08:00'],
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      dosage: '',
      times: ['08:00'],
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      notes: '',
    });
    setEditing(null);
    setError(null);
  };

  const startEdit = (med: Medicine) => {
    setEditing(med);
    setForm({
      name: med.name,
      dosage: med.dosage,
      times: med.times.length ? med.times : ['08:00'],
      start_date: med.start_date,
      end_date: med.end_date ?? '',
      notes: med.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.times.length === 0) {
      setError('Add at least one time');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveMedicine({
        id: editing?.id,
        name: form.name,
        dosage: form.dosage,
        times: form.times,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      });
      resetForm();
      setShowForm(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await deleteMedicine(id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const updateTime = (idx: number, val: string) => {
    setForm((f) => ({ ...f, times: f.times.map((t, i) => (i === idx ? val : t)) }));
  };
  const addTime = () => setForm((f) => ({ ...f, times: [...f.times, '12:00'] }));
  const removeTime = (idx: number) => setForm((f) => ({ ...f, times: f.times.filter((_, i) => i !== idx) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Medicines</h2>
          <p className="text-slate-500 text-sm mt-1">{medicines.length} {t('prescribed')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-teal-600 text-teal-700 font-semibold hover:bg-teal-50 transition-all active:scale-95"
          >
            <ScanLine className="w-5 h-5" /> {t('scanMedicine')}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all hover:shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" /> {t('addMedicine')}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-lg font-bold text-slate-800">{editing ? t('editMedicine') : t('addMedicine')}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('medicineName')} *</label>
                  <div className="relative">
                    <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input pl-10" placeholder="Metformin" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('dosage')} *</label>
                  <input type="text" required value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} className="input" placeholder="500 mg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('scheduleTimes')} *</label>
                <div className="space-y-2">
                  {form.times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} className="input flex-1" />
                      {form.times.length > 1 && (
                        <button type="button" onClick={() => removeTime(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addTime} className="mt-2 text-sm text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> {t('addAnotherTime')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('startDate')} *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="input pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('endDate')}</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('notes')}</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input min-h-[80px]" placeholder="Take with food..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">{t('cancel')}</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> {saving ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <MedicineScanner
          onScan={(data) => {
            setShowScanner(false);
            resetForm();
            setForm((f) => ({ ...f, name: data.name, dosage: data.dosage }));
            setShowForm(true);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="space-y-3">
        {medicines.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">{t('noMedicines')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('noMedicinesHint')}</p>
          </div>
        ) : (
          medicines.map((med) => (
            <div key={med.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{med.name}</h3>
                    <p className="text-sm text-slate-500">{med.dosage}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {med.times.map((t) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime12(t)}
                        </span>
                      ))}
                    </div>
                    {med.notes && <p className="text-xs text-slate-400 mt-2">{med.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(med)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(med.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
