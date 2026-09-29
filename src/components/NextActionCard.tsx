import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { DecisionActionType, DecisionRecord } from '../types.ts';

const META: Record<DecisionActionType, { label: string; cta: string; tone: string }> = {
    ADVANCE: { label: 'Advance', cta: 'Start next concept', tone: 'bg-emerald-100 text-emerald-700' },
    PRACTICE: { label: 'Practice', cta: 'Start practice', tone: 'bg-indigo-100 text-indigo-700' },
    REVIEW: { label: 'Review', cta: 'Start review', tone: 'bg-amber-100 text-amber-700' },
    REMEDIATE_PREREQUISITE: { label: 'Fix Prerequisite', cta: 'Open lesson', tone: 'bg-rose-100 text-rose-700' },
    CHALLENGE: { label: 'Challenge', cta: 'Take challenge', tone: 'bg-violet-100 text-violet-700' },
    TEACHER_INTERVENTION: { label: 'Teacher Help', cta: 'Message teacher', tone: 'bg-orange-100 text-orange-700' },
};

export function NextActionCard({ decision, onAct }: { decision: DecisionRecord | null; onAct: (d: DecisionRecord) => void }) {
    const [open, setOpen] = useState(false);
    if (!decision) return null;
    const meta = META[decision.action] || META.PRACTICE;
    const f = decision.decisionFactors;
    const chips: [string, string][] = [
        ['Mastery', `${f.mastery}%`],
        ['Prereq readiness', `${f.prerequisiteReadiness}%`],
        ['Uncertainty', String(f.uncertainty)],
        ['Forgetting risk', String(f.forgettingRisk)],
        ['Recent errors', String(f.recentErrorsCount)],
        ['Transfer', `${f.transferPerformance}%`],
    ];

    return (
        <section className="mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next best action</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.tone}`}>{meta.label}</span>
                        {decision.teacherOverridden && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">Teacher set</span>
                        )}
                    </div>
                    <h3 className="mt-1 font-bold text-slate-900 truncate">{decision.targetConceptName}</h3>
                    <p className="mt-1 text-sm text-slate-600">{decision.reason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => onAct(decision)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                        >
                            {meta.cta} <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setOpen(!open)}
                            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
                        >
                            Why this? {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {open && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 text-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {chips.map(([k, v]) => (
                            <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                                <div className="text-[11px] text-slate-500">{k}</div>
                                <div className="font-semibold text-slate-800">{v}</div>
                            </div>
                        ))}
                    </div>

                    {decision.prerequisiteChain.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1">Prerequisites</div>
                            <ul className="space-y-1">
                                {decision.prerequisiteChain.map((p) => (
                                    <li key={p.conceptId} className="flex items-center justify-between gap-2">
                                        <span className="text-slate-700 truncate">{p.conceptName}</span>
                                        <span className={p.status === 'SATISFIED' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                            {Math.round(p.masteryScore)}% / {p.threshold}%
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {decision.alternatives.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1">Also considered</div>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                                {decision.alternatives.slice(0, 3).map((a) => (
                                    <li key={a}>{a}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="text-xs text-slate-400">
                        Confidence: {String(decision.confidence)} · Engine {decision.decisionVersion}
                    </div>
                </div>
            )}
        </section>
    );
}