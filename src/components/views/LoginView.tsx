import React, { useEffect, useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (email: string, password: string) => Promise<void>;
  onNavigateRegister: () => void;
  onBackToLanding?: () => void;
  externalError?: string | null;
}

const SSO_CALLBACK_PATH = '/sso-callback';

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onBackToLanding,
  externalError,
}) => {
  const { signIn, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLoginSuccess(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) return;
    setError(null);
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: SSO_CALLBACK_PATH,
        redirectUrlComplete: '/',
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10">
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="miter">
                    <path d="M5 5H19L5 19H19" />
                  </svg>
                </div>
                <span className="text-xl font-black text-black tracking-tight">Zone</span>
              </div>

              {onBackToLanding && (
                <button
                  type="button"
                  id="login-btn-back-landing"
                  onClick={onBackToLanding}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Landing</span>
                </button>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Sign in to synchronize your digital twin and resume your adaptive learning journey.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 flex items-center justify-between">
                <span>{infoMessage}</span>
                <button
                  onClick={() => setInfoMessage(null)}
                  className="text-indigo-600 font-bold ml-2 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                id="login-btn-google"
                onClick={handleGoogle}
                disabled={googleLoading || !isLoaded}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                <GoogleIcon />
                <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  or sign in with email
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="login-input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder-slate-400 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() =>
                      setInfoMessage('Password reset is not available yet. Please contact your administrator.')
                    }
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-input-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder-slate-400 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-600">Remember on this device</span>
                </label>
              </div>

              <button
                type="submit"
                id="login-btn-submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Synchronizing Twin...' : 'Sign In to Zone'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
            Don't have an account?{' '}
            <button
              onClick={onNavigateRegister}
              id="login-btn-to-register"
              className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
            >
              Create an Account & Start Onboarding
            </button>
          </div>
        </div>

        <div className="md:col-span-5 bg-gradient-to-br from-indigo-50 via-purple-50/60 to-slate-100 p-8 sm:p-10 text-slate-900 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/40 rounded-full blur-2xl pointer-events-none" />

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-indigo-700 text-[10px] font-bold border border-indigo-200 shadow-xs">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Digital Twin Synchronization</span>
            </span>

            <h3 className="text-2xl font-black mt-6 leading-tight tracking-tight text-slate-900">
              Learn <br />
              Adapt <br />
              Grow <br />
              Never Forget
            </h3>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              Every practice session, latency metric, and review schedule feeds back directly into your mathematical cognitive model.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 mt-8">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Closed-Loop Cognitive Engine</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
              Calibrated for the Yuva Megathon with adaptive gap detection, Ebbinghaus spaced retention, and live teacher telemetry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};