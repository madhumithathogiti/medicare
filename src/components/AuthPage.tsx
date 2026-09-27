import { useState, useCallback } from 'react';
import { Pill, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';
import { LANGS } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        // Auto sign in after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('Invalid login') || msg.includes('invalid')) {
        setError(t('invalidCredentials'));
      } else if (msg.includes('already') || msg.includes('registered')) {
        setError(t('signupError'));
      } else {
        setError(msg || (mode === 'signup' ? t('signupError') : t('invalidCredentials')));
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      {/* Language selector */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white shadow-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            {LANGS.find((l) => l.code === lang)?.native ?? 'English'}
          </button>
        </div>
        <div className="mt-1 bg-white rounded-xl shadow-md border border-slate-200 py-1 overflow-hidden">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code as Lang)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                lang === l.code ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.native}
              {lang === l.code && <span className="w-2 h-2 rounded-full bg-teal-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-200">
            <Pill className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('welcomeTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('welcomeSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signin' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('signIn')}
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signup' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('signUp')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">{t('loginEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">{t('loginPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-base hover:shadow-lg hover:shadow-teal-200 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('authLoading')}
                </>
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-5 h-5" />
                  {t('signInBtn')}
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  {t('createAccountBtn')}
                </>
              )}
            </button>
          </form>

          {/* Toggle link */}
          <p className="text-center text-sm text-slate-500 mt-5">
            {mode === 'signin' ? t('noAccount') : t('haveAccount')}{' '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="text-teal-600 font-semibold hover:text-teal-700 transition-colors"
            >
              {mode === 'signin' ? t('signUp') : t('signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
