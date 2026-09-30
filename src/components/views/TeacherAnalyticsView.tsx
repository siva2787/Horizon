import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  Flame,
  ArrowDownRight,
  Gauge,
} from 'lucide-react';

const ANIM_CSS = `
@keyframes zt-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes zt-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes zt-sheen{to{transform:translateX(100%)}}
@keyframes zt-glow{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.0)}50%{box-shadow:0 0 28px 2px rgba(139,92,246,.45)}}
@keyframes zt-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.zt-rise{animation:zt-rise .65s cubic-bezier(.2,.7,.2,1) both}
.zt-skel{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zt-shimmer 1.4s linear infinite}
.zt-sheen{position:relative;overflow:hidden}
.zt-sheen::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-100%);animation:zt-sheen 3s ease-in-out infinite}
.zt-glow{animation:zt-glow 2.6s ease-in-out infinite}
.zt-bob{animation:zt-bob 2.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.zt-rise,.zt-skel,.zt-sheen::after,.zt-glow,.zt-bob{animation:none!important}}
`;

const useCountUp = (target: number, ms = 1100) => {
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

const Ring: React.FC<{ pct: number; ready: boolean; from: string; to: string; id: string; delay: number; children: React.ReactNode }> = ({
  pct,
  ready,
  from,
  to,
  id,
  delay,
  children,
}) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative w-[84px] h-[84px] shrink-0">
      <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx="42" cy="42" r={r} fill="none" stroke="#eef2f7" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={ready ? c * (1 - clamped / 100) : c}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)', transitionDelay: `${delay}ms` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-slate-700">{children}</div>
    </div>
  );
};

export const TeacherAnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/teacher/analytics')
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!analytics) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [analytics]);

  const loading = !analytics;
  const weekly: { day: string; active: number }[] = analytics?.weeklyActivity || [];
  const actives = weekly.map((w) => w.active || 0);
  const maxActive = actives.length ? Math.max(...actives) : 0;
  const minActive = actives.length ? Math.min(...actives) : 0;
  const scaleMax = Math.max(analytics?.totalStudents || 0, maxActive, 1);
  const peak = weekly.find((w) => w.active === maxActive);
  const low = weekly.find((w) => w.active === minActive);
  const avgActive = actives.length ? Math.round(actives.reduce((a, b) => a + b, 0) / actives.length) : 0;
  const peakIdx = weekly.findIndex((w) => w.active === maxActive);
  const gridLines = [1, 0.75, 0.5, 0.25, 0];

  const engagement = analytics?.engagement ?? 0;
  const completion = analytics?.assignmentCompletion ?? 0;
  const classAvg = analytics?.classAverage ?? 0;

  const metrics = [
    {
      label: 'Cohort Engagement Rate',
      value: engagement,
      sub: 'Learners active with their twin',
      icon: <Users className="w-4 h-4 text-indigo-600" />,
      from: '#6366f1',
      to: '#8b5cf6',
      id: 'zg-eng',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Assignment Completion',
      value: completion,
      sub: 'Assignments submitted on time',
      icon: <CheckCircle2 className="w-4 h-4 text-violet-600" />,
      from: '#8b5cf6',
      to: '#d946ef',
      id: 'zg-com',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Class Overall Average',
      value: classAvg,
      sub: 'Continuous twin aggregate',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
      from: '#10b981',
      to: '#14b8a6',
      id: 'zg-avg',
      valueClass: 'text-indigo-600',
    },
  ];

  return (
    <div className="space-y-8">
      <style>{ANIM_CSS}</style>

      {/* Header */}
      <div className="zt-rise flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] font-bold text-violet-700 mb-3">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Class Engagement & Retention Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Teacher Analytics</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
            Cohort longitudinal metrics on assignment completion, daily engagement, and average mastery.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>Current Semester</span>
        </div>
      </div>

      {/* Metric cards with animated rings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {metrics.map((m, i) => (
          <div
            key={m.id}
            style={{ animationDelay: `${80 + i * 90}ms` }}
            className="zt-rise group relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(79,70,229,0.28)]"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100/70 to-violet-100/0 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-500">{m.label}</div>
                <div className="mt-2 min-h-[44px]">
                  {loading ? (
                    <div className="zt-skel h-9 w-24 rounded-xl" />
                  ) : (
                    <div className={`text-4xl font-extrabold tracking-tight tabular-nums ${m.valueClass}`}>
                      <Count value={m.value} suffix="%" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">{m.sub}</p>
              </div>
              <Ring pct={m.value} ready={ready} from={m.from} to={m.to} id={m.id} delay={200 + i * 120}>
                {m.icon}
              </Ring>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div
        style={{ animationDelay: '380ms' }}
        className="zt-rise bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Weekly Active Students</h2>
            <p className="text-xs text-slate-500 mt-0.5">Daily unique learners logging in and practicing with their twin</p>
          </div>
          {peak && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100 self-start">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Peak: {peak.day} ({peak.active} student{peak.active === 1 ? '' : 's'})
            </span>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {/* Y axis */}
          <div className="relative w-8 h-64 shrink-0">
            {gridLines.map((g) => (
              <span
                key={g}
                className="absolute right-0 -translate-y-1/2 text-[10px] font-semibold text-slate-400 tabular-nums"
                style={{ top: `${(1 - g) * 100}%` }}
              >
                {Math.round(scaleMax * g)}
              </span>
            ))}
          </div>

          {/* Plot */}
          <div className="relative flex-1 h-64">
            {gridLines.map((g) => (
              <div
                key={g}
                className="absolute inset-x-0 border-t border-dashed border-slate-200"
                style={{ top: `${(1 - g) * 100}%` }}
              />
            ))}

            {loading && <div className="zt-skel absolute inset-0 rounded-2xl opacity-70" />}

            {!loading && weekly.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                No activity recorded yet.
              </div>
            )}

            <div className="absolute inset-0 flex items-end justify-between gap-2 sm:gap-5 px-1">
              {weekly.map((w, idx) => {
                const pct = Math.round(((w.active || 0) / scaleMax) * 100);
                const isPeak = idx === peakIdx && maxActive > 0;
                return (
                  <div key={idx} className="group relative flex-1 h-full flex items-end justify-center">
                    <div
                      className="absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg"
                      style={{ bottom: `calc(${ready ? pct : 0}% + 10px)` }}
                    >
                      {w.active} active
                    </div>
                    <div
                      className={`zt-sheen w-full max-w-[56px] rounded-t-2xl rounded-b-md bg-gradient-to-t transition-[height,filter] duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:brightness-110 ${isPeak
                          ? 'from-indigo-600 via-violet-500 to-fuchsia-400 zt-glow'
                          : 'from-indigo-500/90 via-indigo-400 to-violet-300'
                        }`}
                      style={{
                        height: ready ? `${Math.max(pct, w.active > 0 ? 3 : 0)}%` : '0%',
                        transitionDelay: `${idx * 90}ms`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* X axis labels */}
        <div className="flex gap-3 mt-3">
          <div className="w-8 shrink-0" />
          <div className="flex-1 flex justify-between gap-2 sm:gap-5 px-1">
            {weekly.map((w, idx) => (
              <span
                key={idx}
                className={`flex-1 text-center text-xs font-semibold ${idx === peakIdx && maxActive > 0 ? 'text-indigo-700' : 'text-slate-500'}`}
              >
                {w.day}
              </span>
            ))}
          </div>
        </div>

        {/* Insights */}
        {weekly.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
            {[
              { label: 'Busiest Day', value: peak?.day ?? '-', sub: `${maxActive} active`, icon: <Flame className="w-4 h-4" />, chip: 'bg-orange-50 text-orange-600' },
              { label: 'Quietest Day', value: low?.day ?? '-', sub: `${minActive} active`, icon: <ArrowDownRight className="w-4 h-4" />, chip: 'bg-slate-100 text-slate-600' },
              { label: 'Daily Average', value: String(avgActive), sub: 'active students per day', icon: <Gauge className="w-4 h-4" />, chip: 'bg-indigo-50 text-indigo-600' },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{ animationDelay: `${600 + i * 90}ms` }}
                className="zt-rise flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:shadow-md transition-all"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.chip}`}>{s.icon}</span>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                  <div className="text-base font-extrabold text-slate-900 leading-tight">{s.value}</div>
                  <div className="text-[11px] text-slate-400">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};