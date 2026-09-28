import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Trash2, Download, File, Calendar, AlertCircle, Loader2, X, FilePlus2 } from 'lucide-react';
import { supabase } from '@/lib/db';
import { formatDate, istTodayStr } from '@/lib/time';
import { useI18n } from '@/lib/i18n-context';

type HealthRecord = {
  id: string;
  title: string;
  category: string;
  file_path: string;
  file_name: string;
  file_type: string;
  notes: string | null;
  record_date: string;
  created_at: string;
};

const CATEGORIES = [
  { value: 'lab_report', label: 'Lab Report', icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { value: 'prescription', label: 'Prescription', icon: FilePlus2, color: 'bg-teal-50 text-teal-600' },
  { value: 'scan', label: 'Scan / Imaging', icon: File, color: 'bg-purple-50 text-purple-600' },
  { value: 'vitals', label: 'Vitals', icon: FileText, color: 'bg-amber-50 text-amber-600' },
  { value: 'other', label: 'Other', icon: File, color: 'bg-slate-50 text-slate-600' },
];

function getCategoryConfig(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function HealthRecords() {
  const { t } = useI18n();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');

  const [form, setForm] = useState({
    title: '',
    category: 'lab_report',
    notes: '',
    record_date: istTodayStr(),
  });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .order('record_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecords(data ?? []);
    } catch (e) {
      console.error(e);
      setError(t('recordsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!file || !form.title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop() ?? '';
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('health-records')
        .upload(filePath, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('health_records').insert({
        title: form.title.trim(),
        category: form.category,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        notes: form.notes.trim() || null,
        record_date: form.record_date,
      });
      if (dbErr) throw dbErr;

      setForm({ title: '', category: 'lab_report', notes: '', record_date: istTodayStr() });
      setFile(null);
      setShowUpload(false);
      load();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t('recordsUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (rec: HealthRecord) => {
    if (!confirm(t('recordsDeleteConfirm'))) return;
    try {
      const { error: delErr } = await supabase.storage
        .from('health-records')
        .remove([rec.file_path]);
      if (delErr) throw delErr;
      const { error: dbErr } = await supabase.from('health_records').delete().eq('id', rec.id);
      if (dbErr) throw dbErr;
      load();
    } catch (e) {
      console.error(e);
      setError(t('recordsDeleteError'));
    }
  };

  const handleDownload = async (rec: HealthRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('health-records')
        .createSignedUrl(rec.file_path, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (e) {
      console.error(e);
      setError(t('recordsDownloadError'));
    }
  };

  const filteredRecords = filterDate
    ? records.filter((r) => r.record_date === filterDate)
    : records;

  const groupedByDate: Record<string, HealthRecord[]> = {};
  for (const rec of filteredRecords) {
    if (!groupedByDate[rec.record_date]) groupedByDate[rec.record_date] = [];
    groupedByDate[rec.record_date].push(rec);
  }
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('healthRecords')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('healthRecordsHint')}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all hover:shadow-lg active:scale-95"
        >
          <Upload className="w-5 h-5" /> {t('uploadRecord')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Date filter */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input pl-10"
          />
        </div>
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">{t('noRecords')}</p>
          <p className="text-slate-400 text-sm mt-1">{t('noRecordsHint')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                {formatDate(date)}
              </h3>
              <div className="space-y-3">
                {groupedByDate[date].map((rec) => {
                  const cat = getCategoryConfig(rec.category);
                  return (
                    <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                            <cat.icon className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-slate-800 truncate">{rec.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{cat.label}</p>
                            {rec.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{rec.notes}</p>}
                            <p className="text-xs text-slate-300 mt-1">{rec.file_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(rec)}
                            className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                            title={t('download')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-lg font-bold text-slate-800">{t('uploadRecord')}</h3>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('recordTitle')} *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="input"
                  placeholder="Blood Test Report"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('recordCategory')}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="input"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('recordDate')}</label>
                  <input
                    type="date"
                    value={form.record_date}
                    onChange={(e) => setForm((f) => ({ ...f, record_date: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('selectFile')} *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                  />
                </div>
                {file && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <File className="w-3.5 h-3.5" /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t('notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input min-h-[60px]"
                  placeholder={t('recordNotesHint')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file || !form.title.trim()}
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {uploading ? t('uploading') : t('upload')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
