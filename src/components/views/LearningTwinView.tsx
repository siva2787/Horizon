import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Brain,
  TrendingUp,
  HeartPulse,
  Award,
  Zap,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Target,
  Flame,
} from 'lucide-react';
import { LearningTwin, StudentProfile, LearningTwinConcept, User } from '../../types.ts';

interface LearningTwinViewProps {
  twin: LearningTwin | null;
  subjects?: { id: string; name: string; color: string }[];
  profile: StudentProfile | null;
  twinConcepts: LearningTwinConcept[];
  user?: User | null;
  onNavigateTutor: (conceptId?: string) => void;
  onNavigateGraph: () => void;
  onNavigateRetention: () => void;
  onNavigateGoals?: () => void;
}

export const LearningTwinView: React.FC<LearningTwinViewProps> = ({
  twin,
  subjects = [],
  profile,
  twinConcepts,
  user,
  onNavigateTutor,
  onNavigateGraph,
  onNavigateRetention,
  onNavigateGoals,
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Knowledge' | 'Behavior' | 'Retention' | 'Goals'>('Overview');

  const overallMastery = twin?.overallMastery ?? 0;
  const learningMomentum = twin?.learningMomentum ?? 0;
  const retentionHealth = twin?.retentionHealth ?? 0;

  const subjectStrengths = subjects.map((sub, i) => ({
    name: sub.name,
    mastery: twin?.subjectMastery?.[sub.id] ?? 0,
    color: ['bg-indigo-600', 'bg-emerald-500', 'bg-pink-500', 'bg-blue-500'][i % 4],
  }));

  const [retention, setRetention] = useState<any>(null);
  const [goals, setGoals] = useState<any[] | null>(null);

  useEffect(() => {
    if (activeTab === 'Retention' && !retention) {
      fetch('/api/retention')
        .then((r) => r.json())
        .then((d) => setRetention(d && !d.error ? d : { schedule: [] }))
        .catch(() => setRetention({ schedule: [] }));
    }
    if (activeTab === 'Goals' && goals === null) {
      fetch('/api/goals')
        .then((r) => r.json())
        .then((d) => setGoals(Array.isArray(d) ? d : []))
        .catch(() => setGoals([]));
    }
  }, [activeTab]);

  const sortedConcepts = [...twinConcepts].sort(
    (a: any, b: any) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0)
  );
  const statusStyle = (s?: string) =>
    s === 'Mastered'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'Learning' || s === 'Developing'
        ? 'bg-indigo-100 text-indigo-800'
        : 'bg-slate-100 text-slate-700';
  const riskStyle = (r?: string) =>
    r === 'High' ? 'bg-rose-100 text-rose-800' : r === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
  const schedule: any[] = retention?.schedule || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Header from Screen 7 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Learner Model</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Learning Twin
          </h1>
          <p className="text-xs text-slate-500">
            A dynamic mathematical representation of what you understand and how you retain.
          </p>
        </div>

        {/* Tab Navigation (Overview, Knowledge, Behavior, Retention, Goals) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {(['Overview', 'Knowledge', 'Behavior', 'Retention', 'Goals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${activeTab === tab
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Knowledge Profile & Subject Strengths */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cognitive Snapshot
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Knowledge Profile</h2>
                <p className="text-xs text-slate-500">Subject mastery computed from actual assessments</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="text-xs font-bold text-slate-700">Subject Strengths</div>

                {subjectStrengths.map((sub, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{sub.name}</span>
                      <span className="text-slate-900 font-bold">{sub.mastery}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${sub.color} rounded-full transition-all duration-500`}
                        style={{ width: `${sub.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Overall Mastery Average:</span>
                <span className="text-sm font-extrabold text-indigo-700">{overallMastery}%</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Learning Momentum</span>
              </div>
              <div className="text-2xl font-extrabold text-indigo-950">+{learningMomentum}%</div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Accelerating learning velocity across the past 7 days of practice.
              </p>
            </div>
          </div>

          {/* Center Column: Student Avatar & Twin Hologram (Screen 7 from Reference) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col items-center text-center justify-between min-h-[460px]">
            <div className="w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-4">
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                <span>{user?.name ? `${user.name}'s` : 'Your'} Active Twin Model</span>
              </div>

              <div className="relative my-4 inline-block">
                <div className="w-44 h-44 rounded-3xl overflow-hidden shadow-xl border-4 border-white ring-8 ring-indigo-500/10">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={`${user?.name || 'Student'} Twin`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label="Profile placeholder">
                      <rect width="200" height="200" fill="#e2e8f0" />
                      <circle cx="100" cy="72" r="34" fill="#94a3b8" />
                      <path d="M28 200c0-44 32-70 72-70s72 26 72 70z" fill="#475569" />
                      <path d="M84 132l16 26 16-26z" fill="#f8fafc" />
                      <path d="M100 158l-6 42h12z" fill="#1e293b" />
                    </svg>
                  )}
                </div>

                {/* Floating Hologram Badges */}
                <div className="absolute -bottom-2 -left-4 bg-white px-3 py-1 rounded-xl shadow-md border border-slate-200 text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Active Sync</span>
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 mt-2">{user?.name || ''}</h3>
              <p className="text-xs text-slate-500">{profile?.department || 'AI & Data Science'} • {profile?.yearSemester || '3rd Year'}</p>
            </div>

            <div className="w-full pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 italic">
                "Know Yourself, Learn Better."
              </p>
              <button
                onClick={onNavigateGraph}
                className="mt-3 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Explore In Knowledge Graph →
              </button>
            </div>
          </div>

          {/* Right Column: Learning Behavior & Retention (Screen 7 from Reference) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Learning Behavior Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cognitive Habits
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Learning Behavior</h2>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Study Consistency</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {profile?.studyConsistency || 'High'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Preferred Mode</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                    {profile?.learningMode || 'Visual'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Avg. Session</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    {profile?.avgSessionMinutes || 28} min
                  </span>
                </div>
              </div>
            </div>

            {/* Retention Health Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Memory Decay Model
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Retention Health</h2>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-3xl font-extrabold text-emerald-600 flex items-center gap-2">
                    <span>{retentionHealth}%</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">Healthy Curve</span>
                </div>

                <div className="w-14 h-14 rounded-full bg-emerald-50 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-600 font-extrabold text-sm">
                  <HeartPulse className="w-6 h-6" />
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Based on the Ebbinghaus stability algorithm. 1 concept currently flagged for revision.
              </p>

              <button
                onClick={onNavigateRetention}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Inspect Spaced Revision →
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subjects</span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Subject Mastery</h2>
            </div>
            {subjectStrengths.length === 0 && <p className="text-xs text-slate-500">No enrolled subjects yet.</p>}
            {subjectStrengths.map((sub, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{sub.name}</span>
                  <span className="text-slate-900 font-bold">{sub.mastery}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${sub.color} rounded-full`} style={{ width: `${sub.mastery}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Overall Mastery Average:</span>
              <span className="text-sm font-extrabold text-indigo-700">{overallMastery}%</span>
            </div>
            <button
              onClick={onNavigateGraph}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Explore In Knowledge Graph →
            </button>
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Concept Mastery</h2>
              <span className="text-xs text-slate-400">weakest first</span>
            </div>
            {sortedConcepts.length === 0 && (
              <p className="text-xs text-slate-500">No concepts tracked yet. Join a class to get started.</p>
            )}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {sortedConcepts.map((c: any) => (
                <button
                  key={c.conceptId || c.id}
                  onClick={() => onNavigateTutor(c.conceptId || c.id)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-800 truncate">{c.name || c.conceptName || c.conceptId}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle(c.status)}`}>{c.status || 'Not Learned'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${riskStyle(c.forgettingRisk)}`}>Risk: {c.forgettingRisk || 'Low'}</span>
                      <span className="text-xs font-extrabold text-indigo-700 w-10 text-right">{Math.round(c.masteryScore ?? 0)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, c.masteryScore ?? 0))}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1.5">
                    {c.attemptsCount ?? 0} attempts • Confidence {Math.round(c.confidenceLevel ?? 0)}% • Uncertainty {c.uncertainty || 'High'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Behavior' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Study Consistency', value: profile?.studyConsistency || 'Low', icon: <Clock className="w-4 h-4 text-emerald-600" />, tone: 'bg-emerald-100 text-emerald-800' },
            { label: 'Preferred Mode', value: profile?.learningMode || 'Visual', icon: <Brain className="w-4 h-4 text-purple-600" />, tone: 'bg-purple-100 text-purple-800' },
            { label: 'Avg. Session', value: `${profile?.avgSessionMinutes ?? 0} min`, icon: <Clock className="w-4 h-4 text-indigo-600" />, tone: 'bg-indigo-100 text-indigo-800' },
            { label: 'Learning Streak', value: `${profile?.learningStreakDays ?? 0} days`, icon: <Flame className="w-4 h-4 text-amber-600" />, tone: 'bg-amber-100 text-amber-800' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-extrabold ${item.tone}`}>{item.value}</span>
            </div>
          ))}
          <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span>Learning Momentum</span>
            </div>
            <div className="text-2xl font-extrabold text-indigo-950">
              {learningMomentum >= 0 ? '+' : ''}{learningMomentum}%
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Change in learning velocity across the past 7 days of practice.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'Retention' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Memory Decay Model</span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Retention Health</h2>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-extrabold text-emerald-600">{retentionHealth}%</div>
              <div className="w-14 h-14 rounded-full bg-emerald-50 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-600">
                <HeartPulse className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Based on the Ebbinghaus stability algorithm.{' '}
              {schedule.filter((s) => s.retentionStatus && s.retentionStatus !== 'Healthy' && s.retentionStatus !== 'Strong').length} concept(s) flagged for revision.
            </p>
            <button
              onClick={onNavigateRetention}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Inspect Spaced Revision →
            </button>
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Review Schedule</h2>
            {!retention && <p className="text-xs text-slate-500">Loading…</p>}
            {retention && schedule.length === 0 && <p className="text-xs text-slate-500">Nothing scheduled yet. Practice a concept to start tracking.</p>}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {schedule.map((s) => (
                <button
                  key={s.conceptId}
                  onClick={() => onNavigateTutor(s.conceptId)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{s.conceptName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {s.daysSincePractice ?? 0} days since practice
                      {s.recommendedReviewDate ? ` • Review ${new Date(s.recommendedReviewDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{s.retentionStatus}</span>
                    <span className="text-xs font-extrabold text-indigo-700 w-10 text-right">{Math.round(s.predictedRetentionScore ?? 0)}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Goals' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Learning Goals</h2>
            </div>
            {onNavigateGoals && (
              <button
                onClick={onNavigateGoals}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Manage Goals →
              </button>
            )}
          </div>
          {goals === null && <p className="text-xs text-slate-500">Loading…</p>}
          {goals !== null && goals.length === 0 && (
            <p className="text-xs text-slate-500">No goals yet. Create one to track your progress.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(goals || []).map((g) => {
              const ms: any[] = Array.isArray(g.milestones) ? g.milestones : [];
              const done = ms.filter((m) => m?.completed || m?.done || m?.status === 'Completed').length;
              const pct = Math.min(100, Math.max(0, Math.round(g.overallProgress ?? 0)));
              return (
                <div key={g.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">{g.title}</span>
                    <span className="text-xs font-extrabold text-indigo-700">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {g.targetDate ? `Target ${new Date(g.targetDate).toLocaleDateString()}` : 'No target date'}
                    {ms.length ? ` • ${done}/${ms.length} milestones` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};