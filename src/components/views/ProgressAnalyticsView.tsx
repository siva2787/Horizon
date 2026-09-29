import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Award,
  Calendar,
  Sparkles,
  Download,
  Loader2,
  History,
} from 'lucide-react';

const CSS = `
@keyframes pa-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pa-draw{to{stroke-dashoffset:0}}
@keyframes pa-fade{to{opacity:1}}
@keyframes pa-shine{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes pa-pulse{50%{box-shadow:0 0 0 6px rgba(16,185,129,.15)}}
.pa-up{opacity:0;animation:pa-up .6s cubic-bezier(.2,.8,.2,1) forwards}
.pa-line{stroke-dasharray:1;stroke-dashoffset:1;animation:pa-draw 1.8s .3s ease forwards}
.pa-area{opacity:0;animation:pa-fade 1s 1.2s forwards}
.pa-dot{opacity:0;animation:pa-fade .4s forwards;transition:r .2s;cursor:pointer}
.pa-dot:hover{r:8}
.pa-badge{animation:pa-pulse 2.5s infinite}
.pa-bar{position:relative;overflow:hidden}
.pa-bar::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:pa-shine 2s infinite}
.pa-dl{position:relative;overflow:hidden}
.pa-dl::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.25) 50%,transparent 70%);transform:translateX(-100%);transition:transform .6s}
.pa-dl:hover::after{transform:translateX(100%)}
@media(prefers-reduced-motion:reduce){.pa-up,.pa-line,.pa-area,.pa-dot,.pa-badge,.pa-bar::after{animation-duration:.01s!important;animation-delay:0s!important}}
`;

const useCount = (target: number, ms = 1200) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const f = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
};

const Metric: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  delay: number;
}> = ({ label, value, suffix = '', icon: Icon, color, bg, delay }) => {
  const n = useCount(Number(value) || 0);
  const shown = Number.isInteger(value) ? Math.round(n) : n.toFixed(1);
  return (
    <div
      className="pa-up group bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight tabular-nums">
          {shown}
          {suffix}
        </div>
      </div>
      <div
        className={`w-11 h-11 rounded-xl ${bg} ${color} flex items-center justify-center transition-transform duration-500 group-hover:rotate-[-10deg] group-hover:scale-110`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const ProgressAnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [days, setDays] = useState<number>(14);

  useEffect(() => {
    let alive = true;
    fetch(`/api/progress?days=${days}`)
      .then((res) => res.json())
      .then((d) => alive && setData(d))
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [days]);

  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'visible' && document.hasFocus())
        fetch('/api/activity/ping', { method: 'POST' }).catch(() => { });
    };
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, []);

  const mins = Number(data?.activeMinutes ?? 0);
  const metrics = [
    {
      label: 'Learning Time',
      value: mins >= 60 ? Math.round((mins / 60) * 10) / 10 : mins,
      suffix: mins >= 60 ? 'h' : 'm', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50'
    },
    { label: 'Concepts Mastered', value: Number(data?.conceptsMastered ?? 0), suffix: '', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Assessments Taken', value: Number(data?.assessmentsCount ?? 0), suffix: '', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Average Score', value: Number(data?.avgScore ?? 0), suffix: '%', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const trend: any[] = data?.masteryTrend || [];
  const subjects: any[] = data?.subjectProgress || [];
  const growth = trend.length > 1 ? trend[trend.length - 1].mastery - trend[0].mastery : null;

  const W = 600, H = 220, PX = 24, PT = 30, PB = 20;
  const chart = useMemo(() => {
    if (!trend.length) return null;
    const vals = trend.map((t) => Number(t.mastery) || 0);
    const min = Math.max(0, Math.min(...vals) - 10);
    const max = Math.min(100, Math.max(...vals) + 10) || 100;
    const span = max - min || 1;
    const pts = vals.map((v, i) => ({
      x: trend.length === 1 ? W / 2 : PX + (i * (W - PX * 2)) / (trend.length - 1),
      y: PT + (1 - (v - min) / span) * (H - PT - PB),
      v,
    }));
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i], mx = (p.x + c.x) / 2;
      d += ` C ${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`;
    }
    const area = `${d} L ${pts[pts.length - 1].x},${H - PB} L ${pts[0].x},${H - PB} Z`;
    const grid = [0, 1, 2, 3].map((i) => PT + (i * (H - PT - PB)) / 3);
    return { pts, d, area, grid };
  }, [trend]);

  const overall = subjects.length
    ? Math.round(subjects.reduce((a, s) => a + (Number(s.mastery) || 0), 0) / subjects.length)
    : 0;

  const attempts = useMemo(() => {
    const ts = (d: any) => {
      const t = Date.parse(d);
      return isNaN(t) ? 0 : t;
    };
    return ((data?.attempts || data?.scoreHistory || []) as any[])
      .map((a, i) => ({
        id: a.id ?? i,
        topic: a.topic ?? a.title ?? a.subject ?? 'General',
        score: Number(a.score) || 0,
        attempt: a.attempt ?? a.attemptNumber ?? null,
        date: a.date ?? a.takenAt ?? a.createdAt ?? '',
      }))
      .sort((x, y) => ts(x.date) - ts(y.date));
  }, [data]);

  const topics = useMemo(() => {
    const m = new Map<string, any[]>();
    attempts.forEach((a) => m.set(a.topic, [...(m.get(a.topic) || []), a]));
    return Array.from(m, ([name, list]) => {
      const sc = list.map((x) => x.score);
      return {
        name,
        count: list.length,
        best: Math.max(...sc),
        avg: Math.round(sc.reduce((a, b) => a + b, 0) / sc.length),
        delta: sc.length > 1 ? sc[sc.length - 1] - sc[0] : null,
      };
    });
  }, [attempts]);

  const visible = useMemo(
    () => (topicFilter === 'all' ? attempts : attempts.filter((a) => a.topic === topicFilter)).slice().reverse(),
    [attempts, topicFilter]
  );

  const fmtDate = (d: any) => {
    const t = new Date(d);
    return d && !isNaN(t.getTime()) ? t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : String(d || '—');
  };
  const tone = (n: number) =>
    n >= 70
      ? { t: 'text-emerald-600', b: 'bg-emerald-50 border-emerald-100', bar: 'bg-emerald-500' }
      : n >= 40
        ? { t: 'text-amber-600', b: 'bg-amber-50 border-amber-100', bar: 'bg-amber-500' }
        : { t: 'text-rose-600', b: 'bg-rose-50 border-rose-100', bar: 'bg-rose-500' };

  const downloadReport = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        const now = new Date();
        const rows = (arr: string[][]) => arr.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Progress Report</title><style>
*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#0b0b12;max-width:800px;margin:0 auto;padding:40px 32px}
.h{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0b0b12;padding-bottom:16px;margin-bottom:24px}
.h b{font-size:24px}.h span{color:#666;font-size:12px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;margin:28px 0 10px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.c{border:1px solid #ddd;border-radius:10px;padding:14px}.c small{color:#666;font-size:11px}.c div{font-size:24px;font-weight:800;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #e5e5e5;padding:8px;text-align:left}th{background:#0b0b12;color:#fff}
.b{height:8px;background:#eee;border-radius:9px;overflow:hidden}.b i{display:block;height:100%;background:#0b0b12}
footer{margin-top:40px;font-size:11px;color:#888;text-align:center}
@media print{body{padding:0}}
</style></head><body>
<div class="h"><b>Zone — Student Progress Report</b><span>Generated ${esc(now.toLocaleString())}</span></div>
<h2>Summary</h2>
<div class="g">${metrics.map((m) => `<div class="c"><small>${esc(m.label)}</small><div>${esc(m.value)}${esc(m.suffix)}</div></div>`).join('')}</div>
<h2>Mastery Over Time${growth !== null ? ` (${growth >= 0 ? '+' : ''}${growth}% growth)` : ''}</h2>
<table><tr><th>Period</th><th>Mastery</th></tr>${rows(trend.map((t) => [t.day, `${t.mastery}%`]))}</table>
<h2>Subject Mastery</h2>
${subjects.map((s) => `<p style="margin:10px 0 4px;font-size:13px"><b>${esc(s.name)}</b> — ${esc(s.mastery)}%</p><div class="b"><i style="width:${Math.min(100, Number(s.mastery) || 0)}%"></i></div>`).join('')}
<h2>Topics</h2>
<table><tr><th>Topic</th><th>Attempts</th><th>Best</th><th>Average</th></tr>${rows(topics.map((t) => [t.name, String(t.count), `${t.best}%`, `${t.avg}%`]))}</table>
<h2>Attempts &amp; Score History</h2>
<table><tr><th>Topic</th><th>Attempt</th><th>Date</th><th>Score</th></tr>${rows(attempts.slice().reverse().map((a, i) => [a.topic, `#${a.attempt ?? attempts.length - i}`, fmtDate(a.date), `${a.score}%`]))}</table>
<footer>Confidential · Zone Learning Twin</footer>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `progress-report-${now.toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } finally {
        setBusy(false);
      }
    }, 600);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <style>{CSS}</style>

      <div className="pa-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Mastery Velocity & Long-term Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Progress & Analytics</h1>
          <p className="text-xs text-slate-500">
            Real data from your learning twin: study hours, concept mastery velocity, and test outcomes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-slate-400 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Date range"
              className="bg-transparent outline-none font-bold cursor-pointer"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={0}>All Time</option>
            </select>
          </label>
          <button
            onClick={downloadReport}
            disabled={busy || !data}
            aria-label="Download progress report"
            className="pa-dl group inline-flex items-center gap-2 bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-black/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/35 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            )}
            <span>{busy ? 'Preparing…' : 'Download Report'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <Metric key={m.label} {...m} delay={80 + idx * 70} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className="pa-up lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-100/60"
          style={{ animationDelay: '350ms' }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mastery Over Time</h2>
              <p className="text-xs text-slate-500">Continuous mastery score trajectory across your completed assessments</p>
            </div>
            <span
              className={`pa-badge text-xs font-bold px-3 py-1 rounded-full border ${growth !== null && growth < 0
                ? 'text-rose-600 bg-rose-50 border-rose-100'
                : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                }`}
            >
              {growth !== null ? `${growth >= 0 ? '+' : ''}${growth}% Overall Growth` : 'No trend yet'}
            </span>
          </div>

          <div className="relative w-full pt-2">
            {chart ? (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="paArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="paLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                {chart.grid.map((y) => (
                  <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#eef0f6" strokeDasharray="4 5" />
                ))}
                <path className="pa-area" d={chart.area} fill="url(#paArea)" />
                <path
                  className="pa-line"
                  pathLength={1}
                  d={chart.d}
                  fill="none"
                  stroke="url(#paLine)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chart.pts.map((p, i) => (
                  <g key={i}>
                    <circle
                      className="pa-dot"
                      style={{ animationDelay: `${400 + i * 250}ms` }}
                      cx={p.x}
                      cy={p.y}
                      r="5.5"
                      fill="white"
                      stroke="#6366f1"
                      strokeWidth="3"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    />
                    <text
                      x={p.x}
                      y={p.y - 14}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill={hover === i ? '#4f46e5' : '#334155'}
                      className="pa-dot"
                      style={{ animationDelay: `${600 + i * 250}ms`, pointerEvents: 'none' }}
                    >
                      {p.v}%
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400">No assessment data yet</div>
            )}
          </div>

          <div className="flex justify-between text-xs font-semibold text-slate-400 px-1">
            {trend.map((t: any, idx: number) => (
              <span key={idx} className={`transition-colors ${hover === idx ? 'text-indigo-600' : ''}`}>
                {t.day}
              </span>
            ))}
          </div>
        </div>

        <div
          className="pa-up lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-100/60"
          style={{ animationDelay: '450ms' }}
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">Subject Mastery</h2>
            <p className="text-xs text-slate-500">Distribution across active domains</p>
          </div>

          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="paRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#paRing)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={326.7}
                  strokeDashoffset={data ? 326.7 * (1 - overall / 100) : 326.7}
                  style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1) .5s' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{overall}%</span>
                <span className="text-[10px] font-semibold text-slate-400">Overall</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {subjects.map((s: any, idx: number) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{s.name}</span>
                  <span className="text-slate-900 font-bold">{s.mastery}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`pa-bar h-full ${s.color || 'bg-gradient-to-r from-indigo-500 to-violet-500'} rounded-full`}
                    style={{
                      width: data ? `${Math.min(100, Number(s.mastery) || 0)}%` : '0%',
                      transition: `width 1.4s cubic-bezier(.2,.8,.2,1) ${500 + idx * 120}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-xs text-indigo-950 space-y-1 transition-transform duration-300 hover:scale-[1.02]">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Twin Projection</span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              At your current velocity of {Number(data?.hoursPerDay ?? 0)} hours/day, you are projected to reach 85% overall mastery by next week.
            </p>
          </div>
        </div>
      </div>

      <div
        className="pa-up bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6"
        style={{ animationDelay: '550ms' }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Attempts & Score History
            </h2>
            <p className="text-xs text-slate-500">Every assessment attempt, grouped by topic</p>
          </div>
          {topics.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {['all', ...topics.map((t) => t.name)].map((n) => (
                <button
                  key={n}
                  onClick={() => setTopicFilter(n)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all duration-200 active:scale-95 ${topicFilter === n
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                >
                  {n === 'all' ? 'All Topics' : n}
                </button>
              ))}
            </div>
          )}
        </div>

        {topics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t, i) => {
              const c = tone(t.avg);
              return (
                <button
                  key={t.name}
                  onClick={() => setTopicFilter(topicFilter === t.name ? 'all' : t.name)}
                  className={`pa-up text-left p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100 ${topicFilter === t.name ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white'
                    }`}
                  style={{ animationDelay: `${600 + i * 80}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900 leading-tight">{t.name}</div>
                    {t.delta !== null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.delta >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                        {t.delta >= 0 ? '+' : ''}
                        {t.delta}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between text-[11px] font-semibold text-slate-500">
                    <span>{t.count} attempt{t.count > 1 ? 's' : ''}</span>
                    <span>Best {t.best}%</span>
                  </div>
                  <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`pa-bar h-full rounded-full ${c.bar}`}
                      style={{ width: data ? `${t.avg}%` : '0%', transition: 'width 1.2s cubic-bezier(.2,.8,.2,1) .6s' }}
                    />
                  </div>
                  <div className={`mt-1 text-[11px] font-bold ${c.t}`}>Avg {t.avg}%</div>
                </button>
              );
            })}
          </div>
        )}

        {visible.length ? (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-left text-slate-400 font-semibold">
                  <th className="px-2 py-2">Topic</th>
                  <th className="px-2 py-2">Attempt</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2 w-2/5">Score</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a, i) => {
                  const c = tone(a.score);
                  return (
                    <tr
                      key={`${a.id}-${i}`}
                      className="pa-up border-t border-slate-100 transition-colors hover:bg-slate-50"
                      style={{ animationDelay: `${700 + Math.min(i, 10) * 50}ms` }}
                    >
                      <td className="px-2 py-3 font-semibold text-slate-800">{a.topic}</td>
                      <td className="px-2 py-3">
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                          #{a.attempt ?? visible.length - i}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-500 whitespace-nowrap">{fmtDate(a.date)}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.bar}`}
                              style={{ width: `${Math.min(100, a.score)}%`, transition: 'width 1s cubic-bezier(.2,.8,.2,1) .7s' }}
                            />
                          </div>
                          <span className={`font-extrabold tabular-nums px-2 py-0.5 rounded-md border ${c.b} ${c.t}`}>{a.score}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400">No attempts recorded yet</div>
        )}
      </div>
    </div>
  );
};