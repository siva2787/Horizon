import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
  ChevronLeft,
  GraduationCap,
  School,
} from 'lucide-react';
import { UserRole } from '../../types.ts';

interface RegisterViewProps {
  onRegisterSuccess: (userData: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  onNavigateLogin: () => void;
  onBackToLanding?: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
  onBackToLanding,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) return;
    setError(null);
    setLoading(true);
    try {
      await onRegisterSuccess({ name: name.trim(), email: email.trim(), password, role });
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* Background ambient soft pastel tints */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-100/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10">
        {/* Left Form: Registration */}
        <div className="md:col-span-7 p-8 sm:p-14 flex flex-col justify-between">
          <div>
            {/* Top Navigation & Brand */}
            <div className="flex items-center justify-between mb-10">
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
                  id="register-btn-back-landing"
                  onClick={onBackToLanding}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Landing</span>
                </button>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Create Your Account
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Step into adaptive learning powered by your personal cognitive twin.
            </p>

            {/* Role Selection Segmented Control */}
            <div className="mt-7 p-1 bg-slate-100 rounded-2xl border border-slate-200 grid grid-cols-2 gap-1">
              <button
                type="button"
                id="register-role-student"
                onClick={() => setRole('STUDENT')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${role === 'STUDENT'
                  ? 'bg-white text-black shadow-xs border border-slate-200'
                  : 'text-black hover:text-black'
                  }`}
              >
                <GraduationCap className="w-4 h-4 text-black" />
                <span>Student Learner</span>
              </button>
              <button
                type="button"
                id="register-role-teacher"
                onClick={() => setRole('TEACHER')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${role === 'TEACHER'
                  ? 'bg-white text-black shadow-xs border border-slate-200'
                  : 'text-black hover:text-black'
                  }`}
              >
                <School className="w-4 h-4 text-black" />
                <span>Educator / Teacher</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="register-input-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder-slate-400 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="register-input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email address"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder-slate-400 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="register-input-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Create a password (min. 8 characters)"
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full pl-10 pr-10 py-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder-slate-400 transition-all shadow-xs"
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

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="register-checkbox-terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-600 leading-relaxed">
                    I agree to the continuous cognitive modeling & privacy policy. My data is used solely to calibrate my adaptive learning twin.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                id="register-btn-submit"
                disabled={loading || !agreeTerms}
                className="w-full mt-3 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Initializing Profile...' : 'Create Account & Setup Twin'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Already have an account?</span>
              <button
                type="button"
                onClick={onNavigateLogin}
                id="register-btn-to-login"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              >
                <span>Sign in</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Graphic Banner in Clean Professional Light Theme */}
        <div className="md:col-span-5 bg-gradient-to-br from-purple-50 via-indigo-50/60 to-slate-100 p-8 sm:p-12 text-slate-900 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/40 rounded-full blur-2xl pointer-events-none" />

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-purple-700 text-[10px] font-bold border border-purple-200 shadow-xs">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Instant Twin Initialization</span>
            </span>

            <h3 className="text-2xl font-black mt-6 leading-tight tracking-tight text-slate-900">
              Your Personal <br />
              Academic Twin <br />
              Awaits
            </h3>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              Upon registering, our 4-step wizard will calibrate your preferred learning modality, target milestones, and prerequisite graph.
            </p>
          </div>

          <div className="hidden md:flex flex-1 items-center justify-center py-4">
            <img
              src="/register-illustration.webp"
              alt="Student climbing a path toward their goals"
              width={720}
              height={720}
              className="w-full max-w-[340px] aspect-square object-cover rounded-[2rem] bg-white ring-1 ring-white/80 shadow-xl shadow-purple-200/60"
              draggable={false}
            />
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div className="text-[11px]">
                <div className="font-bold text-slate-800">Diagnostic Placement</div>
                <div className="text-slate-500">Zero-stakes baseline assessment</div>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div className="text-[11px]">
                <div className="font-bold text-slate-800">Dynamic Knowledge Graph</div>
                <div className="text-slate-500">Autonomous prerequisite backtracking</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};