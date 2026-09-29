import { db } from './db/store.ts';

export type Level = 'Easy' | 'Medium' | 'Hard';

export interface QuizPlan {
    target: number;
    min: number;
    max: number;
    startLevel: Level;
    attempt: number;
    fixed: boolean;
    reason: string;
}

const LEVELS: Level[] = ['Easy', 'Medium', 'Hard'];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Mastery-engine driven quiz sizing (2-5 questions) and starting difficulty. */
export function planQuiz(studentId: string, assessmentId: string, conceptId?: string): QuizPlan {
    const state = db.getState();
    const attempt = (state.assessmentAttempts || []).filter((a) => a.studentId === studentId && a.assessmentId === assessmentId).length + 1;
    const tc = conceptId
        ? state.learningTwinConcepts.find((t) => t.studentId === studentId && t.conceptId === conceptId)
        : undefined;
    const ev = conceptId
        ? (state.attemptEvidences || []).filter((e) => e.studentId === studentId && e.conceptId === conceptId).slice(-8)
        : [];

    if (ev.length === 0) {
        return { target: 3, min: 2, max: 5, startLevel: 'Easy', attempt, fixed: false, reason: 'No evidence yet: short baseline.' };
    }

    const hintRate = ev.filter((e) => (e.hintsUsed || 0) > 0).length / ev.length;
    const avgMs = ev.reduce((a, e) => a + (e.responseTimeMs || 12000), 0) / ev.length;
    const acc = ev.filter((e) => e.correct).length / ev.length;
    const mastery = tc?.masteryScore ?? 0;
    const unc = tc?.uncertainty ?? 'High';

    let target = 3;
    if (unc === 'High') target += 1;
    if (hintRate >= 0.4) target += 1;
    if (avgMs > 40000) target += 1;
    if (acc < 0.5) target += 1;
    if (mastery >= 80 && unc === 'Low' && hintRate < 0.2 && avgMs < 30000) target -= 1;
    if (mastery >= 90 && acc >= 0.9 && hintRate === 0) target -= 1;
    target = clamp(target, 2, 5);

    let idx = hintRate >= 0.5 || acc < 0.4 ? 0 : mastery >= 75 && hintRate < 0.3 ? 2 : mastery >= 45 ? 1 : 0;
    if (avgMs > 45000) idx = Math.max(0, idx - 1);

    return {
        target,
        min: 2,
        max: 5,
        startLevel: LEVELS[idx],
        attempt,
        fixed: false,
        reason: `Mastery ${mastery}%, ${unc} uncertainty, ${Math.round(hintRate * 100)}% hint use, ${Math.round(avgMs / 1000)}s avg.`,
    };
}