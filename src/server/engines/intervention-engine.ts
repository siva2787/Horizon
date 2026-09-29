import { db } from '../db/store.ts';
import {
  DecisionActionType,
  TeacherOverride,
  Intervention,
  TeacherStudentSummary,
} from '../../types.ts';
import { evaluateNextAction } from './decision-engine.ts';

export interface CreateOverrideInput {
  studentId: string;
  conceptId: string;
  teacherId: string;
  originalAction: DecisionActionType;
  overriddenAction: DecisionActionType;
  reason: string;
  decisionId?: string;
}

/**
 * Intervention Engine
 * Manages persistent teacher overrides, audit history, and real cohort gap aggregation.
 */
export function createTeacherOverride(input: CreateOverrideInput): TeacherOverride {
  const state = db.getState();

  const override: TeacherOverride = {
    id: `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId: input.studentId,
    conceptId: input.conceptId,
    teacherId: input.teacherId || '',
    decisionId: input.decisionId || `dec_manual_${Date.now()}`,
    originalAction: input.originalAction,
    overriddenAction: input.overriddenAction,
    reason: input.reason || 'Instructor clinical judgement applied.',
    timestamp: new Date().toISOString(),
    active: true,
  };

  if (!state.teacherOverrides) {
    state.teacherOverrides = [];
  }

  // Deactivate any prior override for the same student & concept
  state.teacherOverrides.forEach((o) => {
    if (o.studentId === input.studentId && o.conceptId === input.conceptId) {
      o.active = false;
    }
  });

  state.teacherOverrides.push(override);

  // Re-run decision engine with active override
  evaluateNextAction({
    studentId: input.studentId,
    focusConceptId: input.conceptId,
  });

  db.save();
  return override;
}

export function getTeacherOverrides(studentId?: string): TeacherOverride[] {
  const state = db.getState();
  const list = state.teacherOverrides || [];
  if (studentId) {
    return list.filter((o) => o.studentId === studentId);
  }
  return list;
}

export function revokeTeacherOverride(overrideId: string): boolean {
  const state = db.getState();
  const override = (state.teacherOverrides || []).find((o) => o.id === overrideId);
  if (override) {
    override.active = false;
    evaluateNextAction({
      studentId: override.studentId,
      focusConceptId: override.conceptId,
    });
    db.save();
    return true;
  }
  return false;
}

export function buildLiveStudents(teacherId?: string): TeacherStudentSummary[] {
  const state = db.getState();
  const allowed = teacherId ? db.getTeacherStudentIds(teacherId) : null;
  const dayMs = 86400000;
  return state.users
    .filter((u) => u.role === 'STUDENT' && (!allowed || allowed.has(u.id)))
    .map((u) => {
      const twin = state.learningTwins.find((t) => t.studentId === u.id);
      const profile = state.studentProfiles.find((p) => p.userId === u.id);
      const gaps = state.knowledgeGaps.filter((g) => g.studentId === u.id && g.status !== 'RESOLVED');
      const strengths = state.learningTwinConcepts
        .filter((c) => c.studentId === u.id && c.masteryScore >= 75)
        .map((c) => state.concepts.find((k) => k.id === c.conceptId)?.name || c.conceptId);
      const mastery = twin?.overallMastery || 0;
      const hasData = state.learningTwinConcepts.some((c) => c.studentId === u.id && c.attemptsCount > 0);
      const status: TeacherStudentSummary['status'] = !hasData
        ? 'On Track'
        : mastery < 40 || gaps.some((g) => g.severity === 'Critical')
        ? 'At Risk'
        : mastery < 65 || gaps.length > 0
        ? 'Need Support'
        : 'On Track';
      const last = state.assessmentAttempts
        .filter((a) => a.studentId === u.id)
        .map((a) => a.completedAt || a.startedAt)
        .sort()
        .pop();
      return {
        id: `ts_${u.id}`,
        studentId: u.id,
        name: u.name,
        email: u.email,
        department: profile?.department || '',
        overallMastery: mastery,
        learningMomentum: twin?.learningMomentum || 0,
        retentionHealth: twin?.retentionHealth || 0,
        status,
        strengths,
        knowledgeGaps: gaps.map((g) => g.conceptName),
        recommendedIntervention: gaps[0]
          ? `Review ${gaps[0].missingPrerequisiteName || gaps[0].conceptName}`
          : '',
        lastActive: last || '',
      };
    });
}

/**
 * Derives live cohort analytics and interventions from actual persistent student states.
 */
export function getLiveCohortAnalytics(teacherId?: string): {
  totalStudents: number;
  avgMastery: number;
  atRiskCount: number;
  activeToday: number;
  classSubjectMastery: { subject: string; mastery: number }[];
  interventions: Intervention[];
  students: TeacherStudentSummary[];
} {
  const state = db.getState();
  const students = buildLiveStudents(teacherId);
  const allowed = teacherId ? db.getTeacherStudentIds(teacherId) : null;
  const allowedSubs = teacherId ? db.getTeacherSubjectIds(teacherId) : null;
  const totalStudents = students.length;
  const avgMastery = totalStudents
    ? Math.round(students.reduce((acc, x) => acc + x.overallMastery, 0) / totalStudents)
    : 0;
  const atRiskCount = students.filter((x) => x.status === 'At Risk').length;
  const since = Date.now() - 86400000;
  const activeToday = students.filter((x) => x.lastActive && new Date(x.lastActive).getTime() >= since).length;

  const classSubjectMastery = state.subjects
    .filter((sub) => !allowedSubs || allowedSubs.has(sub.id))
    .map((sub) => {
      const rows = state.learningTwinConcepts.filter(
        (tc) =>
          tc.attemptsCount > 0 &&
          (!allowed || allowed.has(tc.studentId)) &&
          state.concepts.find((c) => c.id === tc.conceptId)?.subjectId === sub.id
      );
      return {
        subject: sub.name,
        mastery: rows.length ? Math.round(rows.reduce((a, r) => a + r.masteryScore, 0) / rows.length) : 0,
      };
    })
    .filter((x) => x.mastery > 0);

  const stored = state.interventions || [];
  const byConcept = new Map<string, { name: string; students: Set<string> }>();
  for (const g of state.knowledgeGaps) {
    if (g.status === 'RESOLVED' || (allowed && !allowed.has(g.studentId))) continue;
    const name = g.underlyingGapConcept || g.missingPrerequisiteName || g.conceptName;
    const entry = byConcept.get(name) || { name, students: new Set<string>() };
    const stu = state.users.find((u) => u.id === g.studentId);
    entry.students.add(stu?.name || g.studentId);
    byConcept.set(name, entry);
  }
  const derived: Intervention[] = [...byConcept.values()]
    .filter((e) => !stored.some((i) => i.id === `int_${e.name}`))
    .map((e) => ({
      id: `int_${e.name}`,
      topicName: e.name,
      concept: e.name,
      groupName: `${e.name} Remediation Cohort`,
      severity: e.students.size >= 8 ? ('HIGH' as const) : e.students.size >= 3 ? ('MEDIUM' as const) : ('LOW' as const),
      affectedStudents: [...e.students],
      affectedCount: e.students.size,
      issue: `Knowledge gap detected in ${e.name}`,
      reason: `Knowledge gap detected in ${e.name}`,
      suggestedAction: `Assign targeted practice on ${e.name}`,
      status: 'Pending' as const,
      createdAt: new Date().toISOString(),
    }));

  return {
    totalStudents,
    avgMastery,
    atRiskCount,
    activeToday,
    classSubjectMastery,
    interventions: [...stored, ...derived],
    students,
  };
}
