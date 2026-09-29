import React from 'react';
import { AlertOctagon, ArrowRight, GitFork, Sparkles, AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { KnowledgeGap } from '../../types.ts';

interface KnowledgeGapExplorerViewProps {
  gaps: KnowledgeGap[];
  onFixGap: (params: any) => void;
  onNavigateGraph: () => void;
}

export const KnowledgeGapExplorerView: React.FC<KnowledgeGapExplorerViewProps> = ({
  gaps,
  onFixGap,
  onNavigateGraph,
}) => {
  const list = [...(gaps || [])].sort((a, b) => a.masteryScore - b.masteryScore);
  const main = list[0];
  const others = list.slice(1);
  const fixTarget = main?.missingPrerequisiteId ? main.missingPrerequisiteName || main.conceptName : main?.conceptName;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 mb-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Automated Diagnostic Backtracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Knowledge Gaps Explorer</h1>
          <p className="text-xs text-slate-500">Root-cause analysis of prerequisite deficiencies detected by your learning twin.</p>
        </div>
        <button
          onClick={onNavigateGraph}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <GitFork className="w-4 h-4 text-indigo-600" />
          <span>View In Knowledge Graph</span>
        </button>
      </div>

      {!main ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <div className="text-sm font-bold text-slate-900">No knowledge gaps detected</div>
          <p className="text-xs text-slate-500">Gaps appear here after you attempt quizzes on your class topics.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-rose-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wide">
                {main.severity} Priority {main.missingPrerequisiteId ? 'Prerequisite ' : ''}Gap
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Detected Gap: {main.conceptName}</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-rose-600">{main.masteryScore}%</div>
              <div className="text-xs text-slate-500 font-medium">Current Mastery</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Why does this gap exist?</span>
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
                {main.reason}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-amber-500" />
                <span>Prerequisite Dependency Chain</span>
              </h3>
              <div className="space-y-2">
                {main.missingPrerequisiteId && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-rose-950">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      1. {main.missingPrerequisiteName}
                    </span>
                    <span className="font-extrabold text-rose-700">Weak prerequisite</span>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-950">
                    {main.missingPrerequisiteId ? '2. ' : '1. '}
                    {main.conceptName}
                    {main.missingPrerequisiteId ? ' (Blocked)' : ''}
                  </span>
                  <span className="font-bold text-indigo-700">{main.masteryScore}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {main.missingPrerequisiteId
                ? `Fixing ${main.missingPrerequisiteName} will help resolve this gap in your twin.`
                : `Practice ${main.conceptName} to raise your mastery and resolve this gap.`}
            </p>
            <button
              onClick={() =>
                onFixGap({
                  conceptId: main.missingPrerequisiteId || main.conceptId,
                  conceptName: fixTarget,
                  masteryScore: main.masteryScore,
                  detectedGap: main.reason,
                  initialPrompt: `Explain ${fixTarget} step by step and give me practice questions to fix my gap.`,
                })
              }
              className="px-5 py-3 bg-linear-to-r from-rose-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fix This Gap with the AI Tutor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Other Flagged Concepts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {others.map((gap) => (
              <div key={gap.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{gap.conceptName}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Mastery: {gap.masteryScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{gap.reason}</p>
                </div>
                <button
                  onClick={() =>
                    onFixGap({
                      conceptId: gap.conceptId,
                      conceptName: gap.conceptName,
                      masteryScore: gap.masteryScore,
                      detectedGap: gap.reason,
                      initialPrompt: `I want to resolve my knowledge gap in ${gap.conceptName} (${gap.masteryScore}%). Please provide a clear breakdown and targeted practice questions.`,
                    })
                  }
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors text-center"
                >
                  Launch Targeted Practice →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};