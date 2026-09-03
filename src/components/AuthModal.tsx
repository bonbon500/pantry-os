import React, { useState } from 'react';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInWithMagicLink,
} from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock, Sparkles, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleModeChange = (newMode: 'signin' | 'signup' | 'magic') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('נא להזין כתובת אימייל תקינה');
      return;
    }

    if (mode !== 'magic' && password.length < 6) {
      setErrorMessage('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { data, error } = await signInWithEmailPassword(email.trim(), password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('פרטי התחברות שגויים. בדוק את הדוא"ל והסיסמה או הירשם כמשתמש חדש.');
          } else {
            setErrorMessage(error.message);
          }
        } else if (data.user) {
          setSuccessMessage('התחברת בהצלחה! מסנכרן את נתוני המזווה שלך מ-Supabase...');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 900);
        }
      } else if (mode === 'signup') {
        const { data, error } = await signUpWithEmailPassword(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else if (data.user) {
          if (data.session) {
            setSuccessMessage('נרשמת והתחברת בהצלחה! סביבת המזווה האישית שלך נוצרה.');
            setTimeout(() => {
              onSuccess?.();
              onClose();
            }, 1000);
          } else {
            setSuccessMessage('ההרשמה בוצעה! אם מוגדר אימות דוא"ל, נשלח אליך קישור אימות.');
            setTimeout(() => {
              onSuccess?.();
              onClose();
            }, 1800);
          }
        }
      } else if (mode === 'magic') {
        const { error } = await signInWithMagicLink(email.trim());
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage(`קישור כניסה מהיר נשלח לכתובת ${email}. בדוק את תיבת הדואר שלך!`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'אירעה שגיאה בלתי צפויה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
      id="modal-supabase-auth"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-auth-modal"
          className="absolute top-4 left-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="סגור חלון"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            {mode === 'signin' && 'התחברות ל-Pantry OS'}
            {mode === 'signup' && 'יצירת חשבון מזווה אישי'}
            {mode === 'magic' && 'כניסה באמצעות קישור קסם (Magic Link)'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            סנכרון מלא של 7 הסלוטים הפיזיים ורשימת הקניות מול מסד הנתונים Supabase
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => handleModeChange('signin')}
            id="tab-auth-signin"
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signin'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            כניסה
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('signup')}
            id="tab-auth-signup"
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            הרשמה
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('magic')}
            id="tab-auth-magic"
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'magic'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Magic Link
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              כתובת אימייל
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                id="input-auth-email"
                className="w-full pl-3 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {mode !== 'magic' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                סיסמה
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  required
                  id="input-auth-password"
                  className="w-full pl-3 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            id="btn-auth-submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>מעבד בקשה...</span>
              </>
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>התחבר למערכת</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>צור חשבון חדש</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>שלח קישור כניסה במייל</span>
              </>
            )}
          </button>
        </form>

        {/* Supabase Endpoint Badge */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Supabase Cloud Auth</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            id="btn-auth-guest"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
          >
            המשך במצב מקומי / אורח
          </button>
        </div>
      </div>
    </div>
  );
};
