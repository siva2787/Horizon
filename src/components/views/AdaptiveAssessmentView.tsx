import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  ArrowRight,
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Play,
  Timer,
  Lightbulb,
  Gauge,
  Repeat,
  Zap,
} from 'lucide-react';
import { Question } from '../../types.ts';

interface AdaptiveAssessmentViewProps {
  assessmentId?: string;
  onComplete: (score: number) => void;
  onNavigateTutor: (params: any) => void;
}

type Level = 'Easy' | 'Medium' | 'Hard';
const LEVELS: Level[] = ['Easy', 'Medium', 'Hard'];
const EXPECTED_SECONDS: Record<Level, number> = { Easy: 20, Medium: 35, Hard: 50 };
const LEVEL_STYLE: Record<Level, string> = {
  Easy: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-800 border-amber-200',
  Hard: 'bg-rose-50 text-rose-800 border-rose-200',
};

const norm = (d: any): Level => {
  const s = String(d || '').toLowerCase();
  return s.startsWith('h') ? 'Hard' : s.startsWith('m') ? 'Medium' : 'Easy';
};

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Confidence (0-100) from response time, answer changes (attempts) and hint usage
const computeConfidence = (seconds: number, level: Level, changes: number, hinted: boolean) => {
  const ratio = seconds / EXPECTED_SECONDS[level];
  const timeScore = ratio <= 0.6 ? 100 : ratio <= 1 ? 85 : ratio <= 1.5 ? 60 : ratio <= 2.2 ? 40 : 20;
  return Math.max(5, Math.min(100, timeScore - changes * 12 - (hinted ? 20 : 0)));
};

const pickNext = (pool: Question[], usedIds: string[], target: Level): Question | undefined => {
  const remaining = pool.filter((q) => !usedIds.includes(q.id));
  if (!remaining.length) return undefined;
  const t = LEVELS.indexOf(target);
  const order = [...LEVELS].sort((a, b) => Math.abs(LEVELS.indexOf(a) - t) - Math.abs(LEVELS.indexOf(b) - t));
  for (const lvl of order) {
    const matches = remaining.filter((q) => norm(q.difficulty) === lvl);
    if (matches.length) return matches[Math.floor(Math.random() * matches.length)];
  }
  return remaining[0];
};

export const AdaptiveAssessmentView: React.FC<AdaptiveAssessmentViewProps> = ({
  assessmentId: initialAssessmentId = 'asmt_diag',
  onComplete,
  onNavigateTutor,
}) => {
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>(initialAssessmentId);
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState<string>('Adaptive Assessment');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [served, setServed] = useState<Question[]>([]);
  const [level, setLevel] = useState<Level>('Easy');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [hinted, setHinted] = useState<Record<string, boolean>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [levelTrail, setLevelTrail] = useState<Level[]>([]);
  const [attempt, setAttempt] = useState(1);
  const [plan, setPlan] = useState<{ target: number; startLevel: Level; attempt: number }>({ target: 3, startLevel: 'Easy', attempt: 1 });
  const [reloadKey, setReloadKey] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const times = useRef<Record<string, number>>({});
  const qStart = useRef<number>(Date.now());
  const runStart = useRef<number>(Date.now());

  useEffect(() => {
    fetch('/api/assessments')
      .then((res) => res.json())
      .then((data) => {
        if (data.assessments && data.assessments.length > 0) setAvailableAssessments(data.assessments);
      })
      .catch((err) => console.error('Failed to load assessments:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    setPhase('idle');
    setServed([]);
    setSelectedAnswers({});
    setScoreResult(null);
    setQuestions([]);

    fetch(`/api/assessment/${activeAssessmentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.assessment) setAssessmentTitle(data.assessment.title || 'Adaptive Assessment');
        if (data.questions && data.questions.length > 0) setQuestions(data.questions);
        if (data.plan) {
          setPlan({ target: data.plan.target, startLevel: data.plan.startLevel || 'Easy', attempt: data.plan.attempt || 1 });
          setAttempt(data.plan.attempt || 1);
        }
      })
      .catch((err) => console.error('Failed to load questions:', err))
      .finally(() => setLoading(false));
  }, [activeAssessmentId, reloadKey]);

  // Live timer
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const quizLen = Math.max(1, Math.min(plan.target, questions.length));
  const currentQ = served[served.length - 1];
  const selectedOption = currentQ ? selectedAnswers[currentQ.id] : undefined;
  const qElapsed = phase === 'running' ? (tick - qStart.current) / 1000 : 0;
  const runElapsed = phase === 'running' ? (tick - runStart.current) / 1000 : totalSeconds;

  const confValues = Object.values(confidence);
  const avgConfidence = confValues.length ? Math.round(confValues.reduce((a, b) => a + b, 0) / confValues.length) : 0;
  const hintCount = Object.values(hinted).filter(Boolean).length;
  const changeCount = Object.values(changes).reduce((a, b) => a + b, 0);
  const timeValues = Object.values(times.current);
  const avgTime = timeValues.length ? Math.round(timeValues.reduce((a, b) => a + b, 0) / timeValues.length) : 0;

  const topic = assessmentTitle.replace(/\s*Practice$/i, '');
  const hintFor = (q: Question) => {
    const custom = (q as any).hint;
    if (custom) return String(custom);
    const stem = q.question.replace(/^Fill in the blank:\s*/i, '');
    const words: string[] = stem.match(/[A-Za-z][A-Za-z-]{5,}/g) || [];
    const key = words.sort((a, b) => b.length - a.length)[0];
    return `This question is from "${topic}". ${key ? `Focus on the key term "${key}" and ` : ''
      }recall how it is defined or used in this topic before choosing.`;
  };

  const startQuiz = () => {
    const first = pickNext(questions, [], plan.startLevel);
    if (!first) return;
    times.current = {};
    setSelectedAnswers({});
    setChanges({});
    setHinted({});
    setConfidence({});
    setLevelTrail([norm(first.difficulty)]);
    setLevel(plan.startLevel);
    setServed([first]);
    setScoreResult(null);
    setSubmitError('');
    runStart.current = Date.now();
    qStart.current = Date.now();
    setTick(Date.now());
    setPhase('running');
  };

  const handleSelect = (option: string) => {
    if (!currentQ) return;
    const prev = selectedAnswers[currentQ.id];
    if (prev && prev !== option) setChanges({ ...changes, [currentQ.id]: (changes[currentQ.id] || 0) + 1 });
    setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: option });
  };

  const submit = async (conf: Record<string, number>) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: activeAssessmentId,
          answers: selectedAnswers,
          responseTimeMap: Object.fromEntries(Object.entries(times.current).map(([k, v]) => [k, Math.round(v * 1000)])),
          confidenceMap: conf,
          hintsUsed: hinted,
          answerChanges: changes,
          attempt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Submission failed');
      setTotalSeconds((Date.now() - runStart.current) / 1000);
      setScoreResult(data);
      setPhase('done');
    } catch (err: any) {
      setSubmitError(err?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!currentQ) return;
    const seconds = (Date.now() - qStart.current) / 1000;
    times.current[currentQ.id] = (times.current[currentQ.id] || 0) + seconds;
    const c = computeConfidence(seconds, norm(currentQ.difficulty), changes[currentQ.id] || 0, !!hinted[currentQ.id]);
    const nextConf = { ...confidence, [currentQ.id]: c };
    setConfidence(nextConf);

    const idx = LEVELS.indexOf(level);
    const nextLevel = LEVELS[c >= 75 ? Math.min(2, idx + 1) : c <= 45 ? Math.max(0, idx - 1) : idx];
    setLevel(nextLevel);

    if (served.length < quizLen) {
      const next = pickNext(questions, served.map((q) => q.id), nextLevel);
      if (next) {
        setServed([...served, next]);
        setLevelTrail([...levelTrail, norm(next.difficulty)]);
        qStart.current = Date.now();
        setTick(Date.now());
        return;
      }
    }
    await submit(nextConf);
  };

  const handleRetake = () => {
    setReloadKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Preparing assessment questions...</p>
      </div>
    );
  }

  const isLast = served.length >= quizLen;
  const answered = phase === 'running' ? served.length - 1 : quizLen;
  const progressPct = quizLen ? Math.round((answered / quizLen) * 100) : 0;
  const confTone = avgConfidence >= 75 ? 'text-emerald-600' : avgConfidence >= 45 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header & Topic Selector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{assessmentTitle}</h1>
              <p className="text-xs text-slate-500">Mastery Flow Engine • Adaptive difficulty • Real-time Learning Twin calibration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase === 'running' && (
              <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5 font-mono">
                <Timer className="w-3.5 h-3.5" />
                {fmt(runElapsed)}
              </span>
            )}
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Live Twin Recalibration
            </span>
          </div>
        </div>

        {availableAssessments.length > 0 && (
          <div className="pt-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Select Built-in Quiz Topic:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {availableAssessments.map((asmt) => {
                const isActive = asmt.id === activeAssessmentId;
                return (
                  <button
                    key={asmt.id}
                    disabled={phase === 'running'}
                    onClick={() => setActiveAssessmentId(asmt.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 disabled:opacity-50 ${isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{asmt.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <Gauge className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Ready to test your mastery?</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              The Mastery Flow Engine starts on <b>Easy</b> and adjusts to <b>Medium</b> or <b>Hard</b> using your
              response time, answer changes and hint usage.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-left">
            {[
              { i: Timer, t: 'Timed', d: 'Response time is tracked per question' },
              { i: Zap, t: 'Adaptive', d: 'Difficulty follows your confidence' },
              { i: Lightbulb, t: 'Hints', d: 'Available, but lower confidence' },
            ].map((x) => (
              <div key={x.t} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <x.i className="w-4 h-4 text-indigo-600" />
                <div className="text-xs font-bold text-slate-900 mt-1.5">{x.t}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{x.d}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {quizLen} questions • Attempt #{attempt}
          </div>
          {questions.length === 0 ? (
            <div className="text-xs text-rose-600 font-semibold">No questions available for this quiz.</div>
          ) : (
            <button
              onClick={startQuiz}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Quiz
            </button>
          )}
        </div>
      )}

      {phase === 'running' && currentQ && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Question Card */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 font-bold text-xs rounded-full border ${LEVEL_STYLE[norm(currentQ.difficulty)]}`}>
                Difficulty: {norm(currentQ.difficulty)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-slate-400" />
                  {fmt(qElapsed)}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Question {served.length} of {quizLen}
                </span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{currentQ.question}</h2>

            {/* Hint */}
            {hinted[currentQ.id] ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{hintFor(currentQ)}</span>
              </div>
            ) : (
              <button
                onClick={() => setHinted({ ...hinted, [currentQ.id]: true })}
                className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Show Hint
                <span className="text-[10px] font-semibold text-amber-600">(lowers confidence)</span>
              </button>
            )}

            <div className="space-y-3 pt-1">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className={`p-4 rounded-2xl border-2 text-sm font-semibold cursor-pointer transition-all flex items-center justify-between ${isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
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

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {submitError}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Answer changes: {changes[currentQ.id] || 0}
              </span>
              <button
                onClick={handleNext}
                disabled={!selectedOption || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <span>
                  {isLast ? (isSubmitting ? 'Evaluating...' : 'Submit & View Results') : 'Next Question'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mastery Flow Engine Panel */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mastery Flow Engine</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Live Progress Tracker</h3>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Confidence</div>
                <div className={`text-2xl font-black ${confValues.length ? confTone : 'text-slate-300'}`}>
                  {confValues.length ? `${avgConfidence}%` : '—'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Next Level</div>
                <div className="text-lg font-black text-slate-900">{level}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Attempt</div>
                <div className="text-lg font-black text-slate-900 flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5 text-slate-400" />#{attempt}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Hints Used</div>
                <div className="text-lg font-black text-slate-900">{hintCount}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Difficulty Path</div>
              <div className="flex flex-wrap gap-1.5">
                {levelTrail.map((l, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${LEVEL_STYLE[l]} ${i === levelTrail.length - 1 ? 'ring-2 ring-indigo-300' : ''
                      }`}
                  >
                    {i + 1}·{l[0]}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-600" />
                <span>Cognitive Feedback</span>
              </div>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Fast, steady answers raise the difficulty. Slow answers, changed answers and hints lower it.
                Avg response: {avgTime}s.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center max-w-2xl mx-auto space-y-6">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${(scoreResult?.score ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}
            >
              {(scoreResult?.score ?? 0) >= 70 ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Assessment Results</h2>
              <p className="text-xs text-slate-500 mt-1">Attempt #{attempt} • Completed in {fmt(totalSeconds)}</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 inline-block px-10">
              <div className={`text-4xl font-black ${(scoreResult?.score ?? 0) >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {scoreResult?.score !== undefined ? scoreResult.score : 0}%
              </div>
              <div className="text-xs font-bold text-slate-500 mt-1">
                {scoreResult?.correctCount ?? 0} of {scoreResult?.totalQuestions ?? quizLen} Questions Correct
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {[
                { l: 'Avg Confidence', v: `${avgConfidence}%` },
                { l: 'Avg Response', v: `${avgTime}s` },
                { l: 'Hints Used', v: String(hintCount) },
                { l: 'Answer Changes', v: String(changeCount) },
              ].map((x) => (
                <div key={x.l} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">{x.l}</div>
                  <div className="text-lg font-black text-slate-900">{x.v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleRetake}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake This Quiz</span>
              </button>
              <button
                onClick={() => onComplete(scoreResult?.score ?? 0)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          {scoreResult?.breakdown && scoreResult.breakdown.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Detailed Answer Review</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {scoreResult.correctCount} Correct • {scoreResult.totalQuestions - scoreResult.correctCount} Incorrect
                </span>
              </div>

              <div className="space-y-4">
                {scoreResult.breakdown.map((item: any, idx: number) => {
                  const isCorrect = item.isCorrect;
                  const q = questions.find((x) => x.id === item.questionId) || questions.find((x) => x.question === item.question);
                  const c = q ? confidence[q.id] : undefined;
                  const t = q ? times.current[q.id] : undefined;
                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isCorrect ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Correct
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold text-[11px] rounded-lg border border-rose-200 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Incorrect
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-400">Question {idx + 1}</span>
                          {q && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${LEVEL_STYLE[norm(q.difficulty)]}`}>
                              {norm(q.difficulty)}
                            </span>
                          )}
                          {c !== undefined && (
                            <span className="text-[10px] font-bold text-slate-500">
                              Confidence {c}% • {Math.round(t || 0)}s{q && hinted[q.id] ? ' • hint used' : ''}
                            </span>
                          )}
                        </div>

                        {!isCorrect && (
                          <button
                            onClick={() =>
                              onNavigateTutor({
                                conceptId: q?.conceptId || 'c_bayes',
                                initialPrompt: `I missed this question on my assessment: "${item.question}". I answered "${item.chosenOption}", but the correct answer is "${item.correctAnswer}". Can you explain why "${item.correctAnswer}" is correct and how I can avoid this mistake?`,
                              })
                            }
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 shrink-0"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            <span>Ask AI Tutor</span>
                          </button>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 leading-snug">{item.question}</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div
                          className={`p-3 rounded-xl border font-medium ${isCorrect
                            ? 'bg-emerald-100/50 border-emerald-200 text-emerald-950'
                            : 'bg-rose-100/50 border-rose-200 text-rose-950'
                            }`}
                        >
                          <span className="font-bold block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                            Your Selected Answer:
                          </span>
                          <span>{item.chosenOption}</span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 font-medium text-slate-900">
                          <span className="font-bold block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                            Correct Answer:
                          </span>
                          <span>{item.correctAnswer}</span>
                        </div>
                      </div>

                      {item.explanation && (
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1">
                          <span className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">💡 Explanation:</span>
                          <p>{item.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};