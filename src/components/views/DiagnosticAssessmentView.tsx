import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Brain, X } from 'lucide-react';
import { Question } from '../../types.ts';

interface DiagnosticAssessmentViewProps {
  onCompleteDiagnostic: (score: number) => void;
  onExit: () => void;
}

export const DiagnosticAssessmentView: React.FC<DiagnosticAssessmentViewProps> = ({
  onCompleteDiagnostic,
  onExit,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const startedAt = useRef<number>(Date.now());
  const responseTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/assessment/asmt_diag')
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d.questions) || d.questions.length === 0) throw new Error('No diagnostic questions available');
        setQuestions(d.questions);
      })
      .catch((e) => setLoadError(e.message || 'Failed to load diagnostic'))
      .finally(() => {
        startedAt.current = Date.now();
        setLoading(false);
      });
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQ = questions[currentIndex];
  const selectedOption = currentQ ? selectedAnswers[currentQ.id] : undefined;

  const handleSelect = (option: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: option,
    });
  };

  const handleNext = async () => {
    responseTimes.current[currentQ.id] = (responseTimes.current[currentQ.id] || 0) + (Date.now() - startedAt.current);
    startedAt.current = Date.now();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers, responseTimeMap: responseTimes.current }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to submit diagnostic');
      onCompleteDiagnostic(data.totalQuestions ? Math.round((data.correctCount / data.totalQuestions) * 100) : 0);
    } catch (e: any) {
      setLoadError(e.message || 'Failed to submit diagnostic');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading diagnostic…</div>;
  }
  if (loadError || !currentQ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-rose-600">
        <span>{loadError || 'No diagnostic questions available'}</span>
        <button onClick={onExit} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col justify-center">
      {/* Top Breadcrumb & Progress */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Diagnostic Assessment</h1>
            <p className="text-xs text-slate-500">Establishing initial twin mastery baseline</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="w-28 sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <button
            type="button"
            id="diagnostic-btn-exit"
            onClick={onExit}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
            title="Exit to Dashboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* Left: Question Card */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200">
              Difficulty: {currentQ.difficulty}
            </span>
            <span className="text-xs font-medium text-slate-400">Concept: Probability Foundations</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {currentQ.question}
          </h2>

          <div className="space-y-3 pt-2">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(option)}
                  className={`p-4 rounded-2xl border-2 text-sm font-semibold cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span>{option}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 flex items-center gap-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!selectedOption || isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>{currentIndex === questions.length - 1 ? 'Finish & Build Twin' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Encouragement Card in Clean Light Mode */}
        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-50 via-purple-50/60 to-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-200 text-slate-900 relative overflow-hidden flex flex-col justify-between min-h-[360px] shadow-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-200/40 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 shadow-xs flex items-center justify-center text-indigo-600 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="text-xl font-black text-slate-900 leading-snug">
              Take a breath. <br />
              You're building your twin!
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
              Every choice you make calibrates your personalized cognitive graph. Mistakes are just prerequisite gaps we'll help you master.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">Your Twin</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Real-time Calibration Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
