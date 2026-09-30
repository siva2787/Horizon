import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Shuffle,
  X,
  History,
  Loader2,
  CheckCircle2,
  LifeBuoy,
  AlertOctagon,
  SearchX,
} from 'lucide-react';
import { TeacherStudentItem } from '../../types.ts';

const ANIM_CSS = `
@keyframes zt-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes zt-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes zt-sheen{to{transform:translateX(100%)}}
.zt-rise{animation:zt-rise .6s cubic-bezier(.2,.7,.2,1) both}
.zt-skel{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zt-shimmer 1.4s linear infinite}
.zt-sheen{position:relative;overflow:hidden}
.zt-sheen::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);transform:translateX(-100%);animation:zt-sheen 3s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.zt-rise,.zt-skel,.zt-sheen::after{animation:none!important}}
`;

const ACTIONS = ['PRACTICE', 'REVIEW', 'ADVANCE', 'REMEDIATE_PREREQUISITE', 'CHALLENGE'];
const EVENT_LABEL: Record<string, string> = {
  TEACHER_OVERRIDE: 'Teacher override',
  OVERRIDE_SUPERSEDED: 'Override replaced',
  OVERRIDE_REVOKED: 'Override revoked',
  OVERRIDE_FULFILLED: 'Override completed',
};

const OverrideModal: React.FC<{ student: TeacherStudentItem; onClose: () => void }> = ({ student, onClose }) => {
  const [path, setPath] = useState<any>(null);
  const [target, setTarget] = useState('');
  const [action, setAction] = useState('PRACTICE');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () =>
    fetch(`/api/learning-path?studentId=${encodeURIComponent(student.id)}`)
      .then((r) => r.json())
      .then((p) => {
        setPath(p);
        setTarget((cur) => cur || p?.classConcepts?.[0]?.conceptId || p?.steps?.[0]?.conceptId || '');
      })
      .catch(() => setErr('Failed to load path'));

  useEffect(() => {
    load();
  }, [student.id]);

  const apply = async () => {
    if (!target || !reason.trim()) {
      setErr('Select a concept and enter a reason');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/teacher/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, targetConceptId: target, overriddenAction: action, reason: reason.trim() }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message || 'Override failed');
      setReason('');
      await load();
    } catch (e: any) {
      setErr(e.message || 'Override failed');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    await fetch(`/api/teacher/override/${id}`, { method: 'DELETE' }).catch(() => { });
    await load();
    setBusy(false);
  };

  const pathSteps: any[] = path?.steps || [];
  const steps: any[] = (path?.classConcepts || []).map((c: any) => {
    const st = pathSteps.find((x) => x.conceptId === c.conceptId);
    return { ...c, masteryScore: st?.masteryScore ?? 0 };
  });
  const active: any[] = path?.activeOverrides || [];
  const history: any[] = path?.history || [];
  const nameOf = (id?: string) => steps.find((s) => s.conceptId === id)?.conceptName || id || '—';
  const cur = path?.currentDecision;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-1">
              <Shuffle className="w-3.5 h-3.5" />
              <span>Override Learning Path</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{student.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!path ? (
          <div className="py-10 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <>
            {cur && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                <div className="font-bold">
                  Current recommendation: {cur.action} · {cur.targetConceptName}
                  {cur.teacherOverridden && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">Teacher override</span>
                  )}
                </div>
                <div className="text-indigo-800">{cur.reason}</div>
              </div>
            )}

            {active.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active overrides</div>
                {active.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">
                        {o.overriddenAction} · {nameOf(o.targetConceptId || o.conceptId)}
                      </div>
                      <div className="text-slate-600">{o.reason}</div>
                    </div>
                    <button
                      onClick={() => revoke(o.id)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-rose-300 text-rose-600 font-bold disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">New override</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600 space-y-1">
                  <span>Next concept</span>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={steps.length === 0}
                    className="w-full h-10 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {steps.length === 0 && <option value="">No concepts available</option>}
                    {steps.map((s) => (
                      <option key={s.conceptId} value={s.conceptId}>
                        {s.conceptName} ({s.masteryScore}%)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600 space-y-1">
                  <span>Action</span>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                  >
                    {ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (shown to the student)"
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              {err && <div className="text-xs font-semibold text-rose-600">{err}</div>}
              <button
                onClick={apply}
                disabled={busy || steps.length === 0}
                className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Apply Override</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Override history
              </div>
              {history.length ? (
                <div className="space-y-2">
                  {history.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-slate-800">{EVENT_LABEL[e.type] || e.type}</span>
                        <span className="text-slate-400">{new Date(e.timestamp).toLocaleString()}</span>
                      </div>
                      {e.from && e.to && (
                        <div className="text-slate-600">
                          {e.from.conceptName} ({e.from.action}) → {e.to.conceptName} ({e.to.action})
                        </div>
                      )}
                      {e.reason && <div className="text-slate-500">{e.reason}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400">No overrides yet</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

interface ClassLearningTwinsViewProps {
  onSelectStudent: (student: TeacherStudentItem) => void;
}

type StatusFilter = 'ALL' | 'On Track' | 'Need Support' | 'At Risk';

const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
  'On Track': { pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
  'Need Support': { pill: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
  'At Risk': { pill: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
};

const AVATAR_TONES = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

const avatarFor = (name: string, url?: string) => {
  if (url) return url;
  const c = (name || '?').charAt(0).toUpperCase();
  const tone = AVATAR_TONES[(name || '?').charCodeAt(0) % AVATAR_TONES.length];
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='${tone}'/><text x='40' y='53' font-size='34' font-weight='700' text-anchor='middle' fill='white' font-family='sans-serif'>${c}</text></svg>`
  )}`;
};

const shortId = (id: string) => (id || '').replace(/^ts_usr_/, '').replace(/^usr_/, '').slice(-6);

export const ClassLearningTwinsView: React.FC<ClassLearningTwinsViewProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [overrideFor, setOverrideFor] = useState<TeacherStudentItem | null>(null);

  useEffect(() => {
    fetch('/api/teacher/students')
      .then((res) => res.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [loaded]);

  const studentList = Array.isArray(students) ? students : [];
  const count = (st: string) => studentList.filter((s) => s.status === st).length;
  const filtered = studentList.filter((s) => {
    const matchSearch = (s.name || '').toLowerCase().includes(search.trim().toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tabs: { key: StatusFilter; label: string; value: number; icon: React.ReactNode; chip: string; ring: string }[] = [
    { key: 'ALL', label: 'All Learners', value: studentList.length, icon: <Users className="w-4 h-4" />, chip: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-500/40 border-indigo-300' },
    { key: 'On Track', label: 'On Track', value: count('On Track'), icon: <CheckCircle2 className="w-4 h-4" />, chip: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-500/40 border-emerald-300' },
    { key: 'Need Support', label: 'Need Support', value: count('Need Support'), icon: <LifeBuoy className="w-4 h-4" />, chip: 'bg-amber-50 text-amber-600', ring: 'ring-amber-500/40 border-amber-300' },
    { key: 'At Risk', label: 'At Risk', value: count('At Risk'), icon: <AlertOctagon className="w-4 h-4" />, chip: 'bg-rose-50 text-rose-600', ring: 'ring-rose-500/40 border-rose-300' },
  ];

  return (
    <div className="space-y-7">
      <style>{ANIM_CSS}</style>

      {/* Header */}
      <div className="zt-rise flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] font-bold text-violet-700 mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>Individualized Digital Twin Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Class Learning Twins</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
            Inspect each learner's cognitive twin model, prerequisite bottlenecks, and momentum.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Filter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tabs.map((t, i) => {
          const active = statusFilter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              style={{ animationDelay: `${70 + i * 70}ms` }}
              className={`zt-rise text-left flex items-center gap-3.5 p-4 rounded-2xl bg-white border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${active ? `ring-4 ${t.ring} shadow-md` : 'border-slate-200/80 shadow-sm'
                }`}
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.chip}`}>{t.icon}</span>
              <span>
                <span className="block text-2xl font-extrabold text-slate-900 leading-none tabular-nums">
                  {loaded ? t.value : '–'}
                </span>
                <span className="block text-[11px] font-semibold text-slate-500 mt-1">{t.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        style={{ animationDelay: '360ms' }}
        className="zt-rise bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-900">
            Learner Roster
            <span className="ml-2 text-xs font-semibold text-slate-400">
              {filtered.length} of {studentList.length}
            </span>
          </div>
          {(statusFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearch('');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm min-w-[860px]">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 pl-6 pr-4 font-bold">Learner Twin</th>
                <th className="py-3.5 px-4 font-bold">Mastery</th>
                <th className="py-3.5 px-4 font-bold">Velocity</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Active Gaps</th>
                <th className="py-3.5 pl-4 pr-6 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loaded &&
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="zt-skel h-10 w-full rounded-xl" />
                    </td>
                  </tr>
                ))}

              {loaded && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <SearchX className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-700">No learners found</div>
                    <div className="text-xs text-slate-400 mt-1">Try a different name or status filter.</div>
                  </td>
                </tr>
              )}

              {filtered.map((s, idx) => {
                const momentum = Number(s.momentum ?? (s as any).learningMomentum ?? 0);
                const gaps: string[] = s.gaps || (s as any).knowledgeGaps || [];
                const mastery = Math.min(100, Math.max(0, Number(s.overallMastery) || 0));
                const st = STATUS_STYLE[s.status] || STATUS_STYLE['At Risk'];
                const barTone =
                  mastery >= 75 ? 'from-emerald-400 to-teal-500' : mastery >= 60 ? 'from-indigo-500 to-violet-500' : mastery >= 30 ? 'from-amber-400 to-orange-400' : 'from-rose-500 to-orange-400';

                return (
                  <tr
                    key={s.id}
                    className="group hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="py-4 pl-6 pr-4 align-middle">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white shadow-md shrink-0 transition-transform duration-300 group-hover:scale-105">
                          <img
                            src={avatarFor(s.name, s.avatarUrl)}
                            alt={s.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{s.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">ID · {shortId(s.id)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="w-10 shrink-0 font-extrabold text-slate-900 tabular-nums">{mastery}%</span>
                        <div className="flex-1 min-w-[48px] h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`zt-sheen h-full rounded-full bg-gradient-to-r ${barTone} transition-[width] duration-[1100ms] ease-out`}
                            style={{ width: ready ? `${mastery}%` : '0%', transitionDelay: `${500 + idx * 80}ms` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      {momentum > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                          <TrendingUp className="w-4 h-4" />+{momentum}%
                        </span>
                      ) : momentum < 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                          <TrendingDown className="w-4 h-4" />
                          {momentum}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-400">
                          <Minus className="w-4 h-4" />0%
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${st.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {s.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 align-middle">
                      {gaps.length === 0 ? (
                        <span className="text-xs font-medium text-slate-300">No active gaps</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {gaps.slice(0, 1).map((g, i) => (
                            <span
                              key={i}
                              title={g}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-semibold truncate max-w-[110px]"
                            >
                              {g}
                            </span>
                          ))}
                          {gaps.length > 1 && (
                            <span
                              title={gaps.join('\n')}
                              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold shrink-0 cursor-default"
                            >
                              +{gaps.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-4 pl-4 pr-6 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setOverrideFor(s)}
                          title="Override learning path"
                          aria-label={`Override learning path for ${s.name}`}
                          className="w-9 h-9 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl transition-all inline-flex items-center justify-center"
                        >
                          <Shuffle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectStudent(s)}
                          className="group/btn h-9 pl-3.5 pr-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all inline-flex items-center gap-0.5"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {overrideFor && <OverrideModal student={overrideFor} onClose={() => setOverrideFor(null)} />}
    </div>
  );
};