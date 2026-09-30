import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  AlertOctagon,
  UserCheck,
  ArrowRight,
  GitFork,
  BarChart3,
  Activity,
  ChevronRight,
} from 'lucide-react';

interface TeacherDashboardViewProps {
  onNavigateClassTwins: () => void;
  onNavigateGapAnalytics: () => void;
  onNavigateInterventions: () => void;
}

const ANIM_CSS = `
@keyframes zt-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes zt-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes zt-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(14px,-12px) scale(1.1)}}
@keyframes zt-ping{0%{box-shadow:0 0 0 0 rgba(244,63,94,.45)}100%{box-shadow:0 0 0 10px rgba(244,63,94,0)}}
@keyframes zt-sheen{to{transform:translateX(100%)}}
.zt-rise{animation:zt-rise .65s cubic-bezier(.2,.7,.2,1) both}
.zt-skel{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zt-shimmer 1.4s linear infinite}
.zt-float{animation:zt-float 9s ease-in-out infinite}
.zt-ping{animation:zt-ping 1.6s ease-out infinite}
.zt-sheen{position:relative;overflow:hidden}
.zt-sheen::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-100%);animation:zt-sheen 2.8s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.zt-rise,.zt-skel,.zt-float,.zt-ping,.zt-sheen::after{animation:none!important}}
`;

const useCountUp = (target: number, ms = 1000) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
};

const Count: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const v = useCountUp(value);
  return (
    <>
      {v}
      {suffix}
    </>
  );
};

const TONES = {
  indigo: { chip: 'bg-indigo-50 text-indigo-600', bar: 'from-indigo-500 to-violet-500', line: 'from-indigo-500 to-violet-500' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', bar: 'from-emerald-400 to-teal-500', line: 'from-emerald-400 to-teal-500' },
  rose: { chip: 'bg-rose-50 text-rose-600', bar: 'from-rose-400 to-orange-400', line: 'from-rose-500 to-orange-400' },
  violet: { chip: 'bg-violet-50 text-violet-600', bar: 'from-violet-500 to-fuchsia-500', line: 'from-violet-500 to-fuchsia-500' },
} as const;

interface KpiProps {
  label: string;
  loading: boolean;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  delay: number;
  onClick?: () => void;
  value: React.ReactNode;
  valueClass?: string;
  footer: React.ReactNode;
  ready: boolean;
  progress?: number;
}

const Kpi: React.FC<KpiProps> = ({ label, loading, icon, tone, delay, onClick, value, valueClass = 'text-slate-900', footer, ready, progress }) => {
  const t = TONES[tone];
  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`zt-rise group relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(79,70,229,0.28)] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.line} opacity-70`} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide">{label}</span>
        <span className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${t.chip}`}>
          {icon}
        </span>
      </div>
      <div className="mt-4 min-h-[44px]">
        {loading ? (
          <div className="zt-skel h-9 w-24 rounded-xl" />
        ) : (
          <div className={`text-4xl font-extrabold tracking-tight tabular-nums ${valueClass}`}>{value}</div>
        )}
      </div>
      {progress !== undefined && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${t.bar} transition-[width] duration-1000 ease-out`}
            style={{ width: ready ? `${Math.min(100, Math.max(0, progress))}%` : '0%', transitionDelay: `${delay + 200}ms` }}
          />
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-3 font-medium">{footer}</p>
    </div>
  );
};

const statusFor = (m: number) =>
  m >= 70
    ? { label: 'Strong', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
    : m >= 40
      ? { label: 'Developing', cls: 'bg-amber-50 text-amber-700 border-amber-100' }
      : { label: 'Needs attention', cls: 'bg-rose-50 text-rose-700 border-rose-100' };

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  onNavigateClassTwins,
  onNavigateGapAnalytics,
  onNavigateInterventions,
}) => {
  const [data, setData] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/teacher/dashboard')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [data]);

  const loading = !data;
  const total = data?.totalStudents ?? 0;
  const avg = data?.avgMastery ?? 0;
  const atRisk = data?.atRiskCount ?? 0;
  const active = data?.activeToday ?? 0;
  const pending = data?.pendingInterventions ?? atRisk;
  const engagement = total > 0 ? Math.round((active / total) * 100) : 0;
  const subjects: { subject: string; mastery: number }[] = data?.classSubjectMastery || [];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8">
      <style>{ANIM_CSS}</style>

      {/* Header */}
      <div className="zt-rise flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] font-bold text-violet-700 mb-3">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Faculty Analytics & Cohort Monitoring</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            AI & Data Science (Batch 2026) <span className="mx-1.5 text-slate-300">•</span> {today}
          </p>
        </div>

        <button
          onClick={onNavigateInterventions}
          className="group inline-flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all"
        >
          <span className="relative flex w-2.5 h-2.5">
            <span className="zt-ping absolute inline-flex w-full h-full rounded-full bg-rose-500" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-rose-500" />
          </span>
          <span>{pending} Pending Interventions</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Kpi
          label="Total Students"
          loading={loading}
          ready={ready}
          delay={60}
          tone="indigo"
          icon={<Users className="w-5 h-5" />}
          onClick={onNavigateClassTwins}
          value={<Count value={total} />}
          footer="Class cohort enrolled"
        />
        <Kpi
          label="Class Average Mastery"
          loading={loading}
          ready={ready}
          delay={140}
          tone="emerald"
          icon={<TrendingUp className="w-5 h-5" />}
          value={<Count value={avg} suffix="%" />}
          progress={avg}
          footer="Aggregated from every student's twin"
        />
        <Kpi
          label="At-Risk Learners"
          loading={loading}
          ready={ready}
          delay={220}
          tone="rose"
          icon={<AlertOctagon className="w-5 h-5" />}
          onClick={onNavigateInterventions}
          valueClass="text-rose-600"
          value={<Count value={atRisk} />}
          footer="Mastery < 60% or bottlenecked"
        />
        <Kpi
          label="Active Today"
          loading={loading}
          ready={ready}
          delay={300}
          tone="violet"
          icon={<Activity className="w-5 h-5" />}
          valueClass="text-violet-700"
          value={
            <>
              <Count value={active} />
              <span className="text-base font-semibold text-slate-400 ml-1.5">/ {total}</span>
            </>
          }
          progress={engagement}
          footer={`${engagement}% daily engagement rate`}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Subject mastery */}
        <div
          style={{ animationDelay: '380ms' }}
          className="zt-rise lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Class Mastery by Subject</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated twin performance across academic modules</p>
            </div>
            <button
              onClick={onNavigateGapAnalytics}
              className="group shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors"
            >
              <span>Topic Heatmap</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="mt-7 space-y-6">
            {loading &&
              [0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="zt-skel h-4 w-40 rounded-lg" />
                  <div className="zt-skel h-3 w-full rounded-full" />
                </div>
              ))}

            {!loading && subjects.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400">No subject data yet.</div>
            )}

            {subjects.map((s, i) => {
              const tone = (['indigo', 'violet', 'emerald', 'rose'] as const)[i % 4];
              const st = statusFor(s.mastery);
              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-7 h-7 rounded-lg text-[11px] font-extrabold flex items-center justify-center ${TONES[tone].chip}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-800 truncate">{s.subject}</span>
                      <span className={`hidden sm:inline px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                      <Count value={s.mastery} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`zt-sheen h-full rounded-full bg-gradient-to-r ${TONES[tone].bar} transition-[width] duration-[1100ms] ease-out`}
                      style={{ width: ready ? `${Math.min(100, Math.max(0, s.mastery))}%` : '0%', transitionDelay: `${480 + i * 120}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          <div
            style={{ animationDelay: '460ms' }}
            className="zt-rise bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]"
          >
            <h3 className="text-sm font-bold text-slate-900 px-1 mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Class Learning Twins', sub: 'Per-student cognitive models', icon: <Users className="w-4 h-4" />, tone: 'indigo' as const, onClick: onNavigateClassTwins },
                { label: 'Knowledge Gap Analytics', sub: 'Topics the class struggles with', icon: <GitFork className="w-4 h-4" />, tone: 'violet' as const, onClick: onNavigateGapAnalytics },
                { label: 'Intervention Center', sub: 'Act on at-risk learners', icon: <BarChart3 className="w-4 h-4" />, tone: 'rose' as const, onClick: onNavigateInterventions },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="group w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 text-left transition-colors"
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[a.tone].chip}`}>{a.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-800">{a.label}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{a.sub}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 transition-all group-hover:text-indigo-500 group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};