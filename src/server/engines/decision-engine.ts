import { db } from '../db/store.ts';
import {
  DecisionActionType,
  DecisionRecord,
  CandidateAction,
  DecisionFactors,
  AttemptEvidence,
  PrerequisiteChainNode,
} from '../../types.ts';
import { evaluatePrerequisiteReadiness } from './prerequisite-engine.ts';
import { calculateRetentionHealth } from './retention-engine.ts';

export const DECISION_ENGINE_VERSION = '3.0.0-zone';

export function logPathEvent(e: Record<string, unknown>) {
  const state = db.getState() as any;
  const log: any[] = (state.pathEvents ||= []);
  log.push({
    id: `pev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...e,
  });
  if (log.length > 5000) log.splice(0, log.length - 5000);
}

export interface EvaluateNextActionParams {
  studentId: string;
  focusConceptId?: string;
  latestEvidence?: AttemptEvidence;
}

type Level = 'Low' | 'Medium' | 'High';

const level = (v: unknown, fallback: Level): Level =>
  typeof v === 'number' ? (v >= 70 ? 'High' : v >= 40 ? 'Medium' : 'Low') : v === 'Low' || v === 'Medium' || v === 'High' ? v : fallback;

const WORDS = ['zero', 'one', 'two', 'three', 'four'];
const count = (n: number, noun: string) => `${n < WORDS.length ? WORDS[n] : n} ${noun}${n === 1 ? '' : 's'}`;

const errorNote = (errors: number, withHints: number) => {
  if (errors <= 0) return '';
  if (withHints >= errors) return `; ${count(errors, 'recent error')} used hints`;
  if (withHints > 0) return `; ${count(errors, 'recent error')}, ${WORDS[Math.min(withHints, 4)]} used hints`;
  return `; ${count(errors, 'recent error')}`;
};

const daysAgo = (iso?: string) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : undefined;

// Walks the prerequisite graph down to the deepest unmet foundation.
function findRootDeficiency(studentId: string, conceptId: string, seen = new Set<string>()): PrerequisiteChainNode | null {
  if (seen.has(conceptId)) return null;
  seen.add(conceptId);
  const r = evaluatePrerequisiteReadiness({ studentId, conceptId });
  if (r.isReady || r.deficientPrerequisites.length === 0) return null;
  const worst = r.deficientPrerequisites.reduce((p, c) => (c.masteryScore < p.masteryScore ? c : p));
  return findRootDeficiency(studentId, worst.conceptId, seen) || worst;
}

/**
 * ZONE Explainable Next-Action Decision Engine.
 * Actions: ADVANCE, PRACTICE, REVIEW, REMEDIATE_PREREQUISITE, CHALLENGE, TEACHER_INTERVENTION.
 * Deterministic: learner state + concept dependency graph + retention + teacher constraints.
 */
export function evaluateNextAction(params: EvaluateNextActionParams): DecisionRecord {
  const { studentId, focusConceptId, latestEvidence } = params;
  const state = db.getState();

  const concepts = db.getStudentConcepts(studentId);
  const sequence = concepts.map((c) => c.id);
  const twinConcepts = state.learningTwinConcepts.filter((tc) => tc.studentId === studentId);
  const evidences = (state.attemptEvidences || []).filter((e) => e.studentId === studentId);
  const teacherOverrides = (state.teacherOverrides || []).filter((o) => o.studentId === studentId && o.active);
  const retentionData: any = calculateRetentionHealth(studentId);
  const urgentIds: string[] = retentionData.urgentReviewConceptIds || [];
  const fadingIds: string[] = retentionData.fadingConceptIds || [];
  const retRecords: any[] = retentionData.records || [];
  const pureQuery = !focusConceptId && !latestEvidence;

  const masteryOf = (id: string) => twinConcepts.find((t) => t.conceptId === id)?.masteryScore ?? 0;

  // 1. Target concept
  let targetConcept = concepts.find((c) => c.id === focusConceptId);
  if (!targetConcept && latestEvidence) targetConcept = concepts.find((c) => c.id === latestEvidence.conceptId);
  if (!targetConcept) {
    for (const cid of sequence) {
      const t = twinConcepts.find((x) => x.conceptId === cid);
      if (!t || t.masteryScore < 75 || t.status === 'Gap') {
        targetConcept = concepts.find((c) => c.id === cid);
        break;
      }
    }
  }
  if (!targetConcept) {
    targetConcept =
      concepts.find((c) => urgentIds.includes(c.id)) ||
      concepts.find((c) => fadingIds.includes(c.id)) ||
      concepts[concepts.length - 1];
  }

  const activeConcept = targetConcept || {
    id: '',
    name: 'No class content',
    description: '',
    difficulty: 'Beginner' as const,
    estimatedMinutes: 15,
    summaryNotes: '',
    topicId: '',
    subjectId: '',
  };

  const conceptId = activeConcept.id;
  const cname = activeConcept.name;
  const tc = twinConcepts.find((t) => t.conceptId === conceptId);
  const conceptEvidences = evidences.filter((e) => e.conceptId === conceptId);

  // 2. Evidence signals
  const attemptsCount = tc?.attemptsCount ?? conceptEvidences.length;
  const masteryScore = tc?.masteryScore ?? 0;
  const m = Math.round(masteryScore);
  const uncertainty = level(tc?.uncertainty, 'High');
  const recentAccuracy = tc?.recentAccuracy ?? (latestEvidence ? (latestEvidence.correct ? 100 : 0) : 0);
  const transferScore = tc?.transferScore ?? 50;
  const forgettingRisk = level(tc?.forgettingRisk, 'Low');
  const hintsUsed = tc?.hintsUsed ?? 0;
  const avgResponseTimeMs = tc?.avgResponseTimeMs ?? 12000;
  const independentCount = tc?.independentEvidenceCount ?? 0;

  const recent = conceptEvidences.slice(-4);
  const recentWrong = recent.filter((e) => !e.correct);
  const recentErrors = recentWrong.length;
  const errorsWithHints = recentWrong.filter((e) => (e.hintsUsed || 0) > 0).length;
  const note = errorNote(recentErrors, errorsWithHints);
  const gaming = Boolean(latestEvidence?.gamingSignals && latestEvidence.gamingSignals.length > 0);
  const gamingPenalty = gaming ? 35 : 0;

  const retRec = retRecords.find((r) => r.conceptId === conceptId);
  const lastEv = conceptEvidences[conceptEvidences.length - 1];
  const lastPracticedDaysAgo = retRec?.daysSincePractice ?? daysAgo(tc?.lastPracticedAt ?? lastEv?.timestamp) ?? 0;

  // 3. Prerequisites
  const prereqEval = evaluatePrerequisiteReadiness({ studentId, conceptId });

  // 4. Candidates
  const candidates: CandidateAction[] = [];

  if (!prereqEval.isReady && prereqEval.deficientPrerequisites.length > 0) {
    const direct = prereqEval.deficientPrerequisites.reduce((p, c) => (c.masteryScore < p.masteryScore ? c : p));
    const weak = findRootDeficiency(studentId, conceptId) || direct;
    candidates.push({
      action: 'REMEDIATE_PREREQUISITE',
      targetConceptId: weak.conceptId,
      targetConceptName: weak.conceptName,
      score: 95 + (70 - weak.masteryScore) * 0.2,
      reason: `Review ${weak.conceptName} before ${cname}: prerequisite mastery ${Math.round(weak.masteryScore)}% (needs ${weak.threshold}%)${note}.`,
      valid: true,
    });
  }

  const isUrgent = urgentIds.includes(conceptId);
  const isFading = fadingIds.includes(conceptId);
  if (attemptsCount > 0 && (isUrgent || isFading || forgettingRisk !== 'Low')) {
    const d = lastPracticedDaysAgo;
    candidates.push({
      action: 'REVIEW',
      targetConceptId: conceptId,
      targetConceptName: cname,
      score: isUrgent ? 96 : 91,
      reason: `Review ${cname}: last practiced ${d} day${d === 1 ? '' : 's'} ago; retention risk ${forgettingRisk.toLowerCase()}, mastery ${m}%.`,
      valid: true,
    });
  }

  if (pureQuery) {
    const otherId = urgentIds.find((id) => id !== conceptId && concepts.some((c) => c.id === id));
    if (otherId) {
      const oc = concepts.find((c) => c.id === otherId)!;
      const rr = retRecords.find((r) => r.conceptId === otherId);
      const d = rr?.daysSincePractice ?? 0;
      candidates.push({
        action: 'REVIEW',
        targetConceptId: otherId,
        targetConceptName: oc.name,
        score: 92,
        reason: `Review ${oc.name}: last practiced ${d} day${d === 1 ? '' : 's'} ago; retention urgent, mastery ${Math.round(masteryOf(otherId))}%.`,
        valid: true,
      });
    }
  }

  if ((recentErrors >= 3 && hintsUsed >= 3 && masteryScore < 45) || (attemptsCount >= 8 && masteryScore < 40)) {
    candidates.push({
      action: 'TEACHER_INTERVENTION',
      targetConceptId: conceptId,
      targetConceptName: cname,
      score: 88,
      reason: `Ask your teacher about ${cname}: stuck at ${m}% after ${count(attemptsCount, 'attempt')}${note}.`,
      valid: true,
    });
  }

  if (gaming) {
    candidates.push({
      action: 'PRACTICE',
      targetConceptId: conceptId,
      targetConceptName: cname,
      score: 90,
      reason: `Practice ${cname} again: last attempt looked rushed or guessed, so it counts as weak evidence (mastery ${m}%).`,
      valid: prereqEval.isReady,
    });
  }

  if (masteryScore < 75 || uncertainty === 'High' || (transferScore < 50 && attemptsCount >= 2)) {
    let score = prereqEval.isReady ? 80 : 75;
    let reason = `Practice ${cname}: mastery ${m}% (target 75%)${note}.`;
    if (uncertainty === 'High' && masteryScore >= 70) {
      score = 86;
      reason = `Practice ${cname}: mastery ${m}% but only ${count(independentCount, 'unaided proof point')}; more independent evidence needed before advancing.`;
    } else if (transferScore < 50 && attemptsCount >= 2) {
      score = 87;
      reason = `Practice ${cname}: transfer performance ${Math.round(transferScore)}%; basic items passed but harder application questions missed.`;
    }
    candidates.push({
      action: 'PRACTICE',
      targetConceptId: conceptId,
      targetConceptName: cname,
      score,
      reason,
      valid: prereqEval.isReady,
    });
  }

  const strong = masteryScore >= 80 && uncertainty === 'Low' && prereqEval.isReady && !isUrgent && !isFading && !gaming;
  if (strong && transferScore >= 75) {
    candidates.push({
      action: 'CHALLENGE',
      targetConceptId: conceptId,
      targetConceptName: cname,
      score: 91,
      reason: `Challenge on ${cname}: mastery ${m}%, transfer ${Math.round(transferScore)}%, low uncertainty; ready for advanced application.`,
      valid: true,
    });
  }

  if (masteryScore >= 75 && prereqEval.isReady && uncertainty !== 'High' && !isUrgent && !isFading && forgettingRisk === 'Low' && !gaming) {
    const idx = sequence.indexOf(conceptId);
    const order = [...sequence.slice(idx + 1), ...sequence.slice(0, Math.max(idx, 0))];
    let next = undefined as (typeof concepts)[number] | undefined;
    for (const id of order) {
      if (masteryOf(id) >= 75) continue;
      if (evaluatePrerequisiteReadiness({ studentId, conceptId: id }).isReady) {
        next = concepts.find((c) => c.id === id);
        break;
      }
    }
    if (next) {
      candidates.push({
        action: 'ADVANCE',
        targetConceptId: next.id,
        targetConceptName: next.name,
        score: 89,
        reason: `Advance to ${next.name}: ${cname} mastered (${m}%) and prerequisites are met.`,
        valid: true,
      });
    }
  }

  if (candidates.length === 0) {
    const mastered = masteryScore >= 75;
    candidates.push({
      action: mastered ? 'CHALLENGE' : 'PRACTICE',
      targetConceptId: conceptId,
      targetConceptName: cname,
      score: 60,
      reason: mastered
        ? `Challenge on ${cname}: syllabus mastered (${m}%); deepen with advanced problems.`
        : `Practice ${cname}: mastery ${m}%.`,
      valid: true,
    });
  }

  // 5. Select
  const validCandidates = candidates.filter((c) => c.valid);
  validCandidates.sort((a, b) => b.score - a.score || a.action.localeCompare(b.action));
  let selected = validCandidates[0] || candidates[0];

  // 6. Teacher override
  let teacherOverridden = false;
  let teacherOverrideId: string | undefined;
  const ovs = (teacherOverrides as any[]).slice().reverse();
  let activeOverride: any = pureQuery ? ovs.find((o) => o.targetConceptId) : undefined;
  if (activeOverride && masteryOf(activeOverride.targetConceptId) >= 75) {
    activeOverride.active = false;
    activeOverride.fulfilledAt = new Date().toISOString();
    logPathEvent({
      type: 'OVERRIDE_FULFILLED',
      studentId,
      overrideId: activeOverride.id,
      to: { conceptId: activeOverride.targetConceptId },
      reason: 'Override target mastered; system path resumed',
    });
    db.save();
    activeOverride = undefined;
  }
  if (!activeOverride) {
    activeOverride = ovs.find(
      (o) => !o.targetConceptId && (o.conceptId === conceptId || o.conceptId === selected.targetConceptId)
    );
  }
  if (activeOverride) {
    teacherOverridden = true;
    teacherOverrideId = activeOverride.id;
    const rt = activeOverride.targetConceptId
      ? concepts.find((c) => c.id === activeOverride.targetConceptId)
      : undefined;
    selected = {
      action: activeOverride.overriddenAction,
      targetConceptId: rt?.id ?? selected.targetConceptId,
      targetConceptName: rt?.name ?? selected.targetConceptName,
      score: 100,
      reason: `Teacher override: ${activeOverride.reason} (system suggested ${activeOverride.originalAction}${rt && activeOverride.originalTargetName ? ` on ${activeOverride.originalTargetName}` : ''
        }).`,
      valid: true,
    };
  }

  // 7. Record
  const decisionFactors: DecisionFactors = {
    mastery: m,
    uncertainty,
    prerequisiteReadiness: prereqEval.readinessScore,
    recentErrorsCount: recentErrors,
    transferPerformance: Math.round(transferScore),
    forgettingRisk,
    gamingPenalty,
    confidenceAverage: tc?.confidenceLevel ?? 60,
    teacherConstraintApplied: teacherOverridden,
  };

  const alternatives = validCandidates
    .filter((c) => c.action !== selected.action || c.targetConceptId !== selected.targetConceptId)
    .map((c) => `${c.action} on ${c.targetConceptName} (Score: ${c.score.toFixed(0)})`);

  const decisionConfidence: 'High' | 'Medium' | 'Low' =
    independentCount >= 3 && prereqEval.chain.length > 0 ? 'High' : independentCount >= 1 ? 'Medium' : 'Low';

  const record: DecisionRecord = {
    id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentId,
    action: selected.action as DecisionActionType,
    targetConceptId: selected.targetConceptId,
    targetConceptName: selected.targetConceptName,
    reason: selected.reason,
    decisionFactors,
    evidenceSummary: {
      recentAccuracy,
      recentErrors,
      hintsUsed,
      avgResponseTimeMs,
      independentEvidenceCount: independentCount,
      isTransferAttempt: latestEvidence?.isTransferQuestion,
      lastPracticedDaysAgo,
    },
    prerequisiteChain: prereqEval.chain,
    candidateActions: validCandidates,
    alternatives,
    confidence: decisionConfidence,
    decisionVersion: DECISION_ENGINE_VERSION,
    inputEvidenceIds: conceptEvidences.map((e) => e.id),
    timestamp: new Date().toISOString(),
    teacherOverridden,
    teacherOverrideId,
  };

  if (!state.decisionRecords) state.decisionRecords = [];
  const recs = state.decisionRecords;
  let prev: DecisionRecord | undefined;
  for (let i = recs.length - 1; i >= 0; i--) {
    if (recs[i].studentId === studentId) {
      prev = recs[i];
      break;
    }
  }

  const ts = (state.teacherStudents || []).find((s) => s.studentId === studentId);

  // Unchanged decision: refresh in place instead of growing the audit log on every read.
  if (
    prev &&
    prev.action === record.action &&
    prev.targetConceptId === record.targetConceptId &&
    prev.reason === record.reason &&
    prev.teacherOverridden === record.teacherOverridden
  ) {
    Object.assign(prev, record, { id: prev.id, timestamp: prev.timestamp });
    if (ts) ts.currentDecision = prev;
    return prev;
  }

  recs.push(record);
  if (recs.length > 3000) recs.splice(0, recs.length - 3000);
  if (ts) ts.currentDecision = record;
  db.save();
  return record;
}

/**
 * Decision Replay: re-runs the engine against current evidence for audit.
 */
export function replayDecision(decisionId: string): DecisionRecord | null {
  const state = db.getState();
  const decision = (state.decisionRecords || []).find((d) => d.id === decisionId);
  if (!decision) return null;
  return evaluateNextAction({
    studentId: decision.studentId,
    focusConceptId: decision.targetConceptId,
  });
}