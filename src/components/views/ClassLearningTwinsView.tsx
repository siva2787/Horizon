import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  Shuffle,
  X,
  History,
  Loader2,
} from 'lucide-react';
import { TeacherStudentItem } from '../../types.ts';

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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
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
    </div>
  );
};

interface ClassLearningTwinsViewProps {
  onSelectStudent: (student: TeacherStudentItem) => void;
}

export const ClassLearningTwinsView: React.FC<ClassLearningTwinsViewProps> = ({
  onSelectStudent,
}) => {
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'On Track' | 'Need Support' | 'At Risk'>('ALL');
  const [overrideFor, setOverrideFor] = useState<TeacherStudentItem | null>(null);

  useEffect(() => {
    fetch('/api/teacher/students')
      .then((res) => res.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  const studentList = Array.isArray(students) ? students : [];
  const filtered = studentList.filter((s) => {
    const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header from Screen 18 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Individualized Digital Twin Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Class Learning Twins
          </h1>
          <p className="text-xs text-slate-500">
            Inspect each learner's cognitive twin model, prerequisite bottlenecks, and momentum.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-700 shadow-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="On Track">On Track</option>
            <option value="Need Support">Need Support</option>
            <option value="At Risk">At Risk</option>
          </select>
        </div>
      </div>

      {/* Student Roster Table (Screen 18 from Reference) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-6">Learner Twin</th>
                <th className="py-3.5 px-4">Mastery</th>
                <th className="py-3.5 px-4">Velocity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Active Gaps</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const avatar = s.avatarUrl || `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='#6366f1'/><text x='32' y='42' font-size='28' text-anchor='middle' fill='white' font-family='sans-serif'>${(s.name || '?').charAt(0).toUpperCase()}</text></svg>`)}`;
                const momentum = s.momentum ?? (s as any).learningMomentum ?? 0;
                const gaps = s.gaps || (s as any).knowledgeGaps || [];

                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 ring-2 ring-indigo-500/10 shrink-0">
                        <img
                          src={avatar}
                          alt={s.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.id}</div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{s.overallMastery}%</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.overallMastery >= 75
                              ? 'bg-emerald-500'
                              : s.overallMastery >= 60
                                ? 'bg-indigo-600'
                                : 'bg-rose-500'
                              }`}
                            style={{ width: `${s.overallMastery}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-bold text-emerald-600">
                      +{momentum}%
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'On Track'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'Need Support'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                          }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {gaps.map((g: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => setOverrideFor(s)}
                        className="mr-2 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1"
                      >
                        <Shuffle className="w-3 h-3" />
                        <span>Override Path</span>
                      </button>
                      <button
                        onClick={() => onSelectStudent(s)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1"
                      >
                        <span>Inspect Twin</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
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