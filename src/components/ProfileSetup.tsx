import { useState, type FormEvent } from 'react';
import { User, Phone, Mail, Heart, Shield, Save, ArrowRight } from 'lucide-react';
import { saveProfile } from '@/lib/db';
import type { Profile } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';

type Props = {
  existing: Profile | null;
  onSaved: () => void;
};

export function ProfileSetup({ existing, onSaved }: Props) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    age: existing?.age ?? '',
    phone: existing?.phone ?? '',
    email: existing?.email ?? '',
    guardian_name: existing?.guardian_name ?? '',
    guardian_phone: existing?.guardian_phone ?? '',
    guardian_email: existing?.guardian_email ?? '',
    guardian_relationship: existing?.guardian_relationship ?? '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        name: form.name,
        age: Number(form.age),
        phone: form.phone,
        email: form.email || null,
        guardian_name: form.guardian_name,
        guardian_phone: form.guardian_phone,
        guardian_email: form.guardian_email || null,
        guardian_relationship: form.guardian_relationship || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-200">
            <Heart className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">{t('setupTitle')}</h1>
          <p className="text-slate-500 mt-2">{t('setupSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-teal-600" />
              <h2 className="font-semibold text-slate-800">{t('patientInfo')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('fullName')} required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="input"
                  placeholder="John Doe"
                />
              </Field>
              <Field label={t('age')} required>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                  className="input"
                  placeholder="72"
                />
              </Field>
              <Field label={t('phoneNumber')} required>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className="input pl-10"
                    placeholder="+1 555 0100"
                  />
                </div>
              </Field>
              <Field label={t('email')}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className="input pl-10"
                    placeholder="john@example.com"
                  />
                </div>
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-teal-600" />
              <h2 className="font-semibold text-slate-800">{t('guardianInfo')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('guardianName')} required>
                <input
                  type="text"
                  required
                  value={form.guardian_name}
                  onChange={(e) => set('guardian_name', e.target.value)}
                  className="input"
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label={t('relationship')}>
                <input
                  type="text"
                  value={form.guardian_relationship}
                  onChange={(e) => set('guardian_relationship', e.target.value)}
                  className="input"
                  placeholder="Daughter"
                />
              </Field>
              <Field label={t('guardianPhone')} required>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={form.guardian_phone}
                    onChange={(e) => set('guardian_phone', e.target.value)}
                    className="input pl-10"
                    placeholder="+1 555 0200"
                  />
                </div>
              </Field>
              <Field label={t('guardianEmail')}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.guardian_email}
                    onChange={(e) => set('guardian_email', e.target.value)}
                    className="input pl-10"
                    placeholder="jane@example.com"
                  />
                </div>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-xl bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? t('saving') : t('saveContinue')}
            {!saving && <ArrowRight className="w-5 h-5" />}
            {saving && <Save className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
