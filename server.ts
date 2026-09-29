import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db/store.ts';
import { updateTwinMastery, updateConceptMasteryFromEvidence } from './src/server/engines/mastery-engine.ts';
import { detectKnowledgeGaps } from './src/server/engines/knowledge-gap-engine.ts';
import { generateAdaptiveLearningPath, generateLearningPathItems } from './src/server/engines/adaptive-path-engine.ts';
import { calculateRetentionHealth, recordPracticeSession } from './src/server/engines/retention-engine.ts';
import { recordAttemptEvidence, getStudentEvidence } from './src/server/engines/evidence-engine.ts';
import { evaluateNextAction, replayDecision } from './src/server/engines/decision-engine.ts';
import { evaluatePrerequisiteReadiness } from './src/server/engines/prerequisite-engine.ts';
import {
  createTeacherOverride,
  getTeacherOverrides,
  revokeTeacherOverride,
  getLiveCohortAnalytics,
  buildLiveStudents,
} from './src/server/engines/intervention-engine.ts';
import { runTwoLearnerSimulation, runJudgeStressTests } from './src/server/engines/simulation-engine.ts';
import { generateTutorResponse } from './src/server/ai-tutor-service.ts';
import { generateQuestionsFromText } from './src/server/local-quiz-model.ts';
import { generateQuizFromMaterial, ensureFreshQuestions, pickQuizSet } from './src/server/ai-quiz-service.ts';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 5MB limit for attachments/profiles
  app.use(express.json({ limit: '25mb' }));

  const hashPassword = (pw: string) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
  };
  const verifyPassword = (pw: string, stored?: string) => {
    if (!stored) return false;
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const a = Buffer.from(hash, 'hex');
    const b = crypto.scryptSync(pw, salt, 64);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  const publicUser = (u: any) => {
    const { passwordHash, ...rest } = u;
    return rest;
  };

  // Per-browser sessions (cookie -> userId), persisted so restarts keep logins
  const SESS_FILE = path.join(process.cwd(), 'data', 'sessions.json');
  const sessions = new Map<string, string>();
  try {
    Object.entries(JSON.parse(fs.readFileSync(SESS_FILE, 'utf-8'))).forEach(([k, v]) => sessions.set(k, String(v)));
  } catch {
    // no sessions yet
  }
  const persistSessions = () => {
    try {
      fs.mkdirSync(path.dirname(SESS_FILE), { recursive: true });
      fs.writeFileSync(SESS_FILE, JSON.stringify(Object.fromEntries(sessions)));
    } catch {
      // ignore
    }
  };
  const getSid = (req: any): string => String(req.headers['x-zone-sid'] || req.query?.sid || '');
  const startSession = (res: any, userId: string): string => {
    const sid = crypto.randomBytes(24).toString('hex');
    sessions.set(sid, userId);
    persistSessions();
    return sid;
  };
  const endSession = (req: any, res: any) => {
    sessions.delete(getSid(req));
    persistSessions();
  };
  const uid = (req: any): string => req.uid || '';
  const roleOf = (req: any) => db.getState().users.find((u) => u.id === uid(req))?.role;
  const resolveStudent = (req: any, requested?: string): string => {
    if (roleOf(req) !== 'TEACHER') return uid(req);
    const id = requested || '';
    return db.getTeacherStudentIds(uid(req)).has(id) ? id : '';
  };

  app.use('/api', (req, res, next) => {
    (req as any).uid = sessions.get(getSid(req)) || '';
    if (req.path.startsWith('/auth/') || req.path.startsWith('/concepts')) return next();
    if (!uid(req) || !db.getState().users.some((u) => u.id === uid(req))) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (req.path.startsWith('/teacher') && roleOf(req) !== 'TEACHER') {
      return res.status(403).json({ error: 'teacher only' });
    }
    next();
  });

  const buildDiagnostic = (studentId: string) => {
    const state = db.getState();
    const out: typeof state.questions = [];
    for (const c of db.getStudentConcepts(studentId)) {
      const qs = state.questions.filter((q) => q.conceptId === c.id);
      const pick = qs.find((q) => q.id.startsWith('q_diag_')) || qs.find((q) => q.difficulty === 'Easy') || qs[0];
      if (pick) out.push(pick);
    }
    return out.slice(0, 15);
  };

  const findAssessment = (studentId: string, id: string) => {
    const state = db.getState();
    if (id === 'asmt_diag') {
      const qs = buildDiagnostic(studentId);
      return {
        id: 'asmt_diag',
        title: 'Diagnostic Assessment',
        type: 'DIAGNOSTIC' as const,
        subjectId: '',
        questionIds: qs.map((q) => q.id),
        totalQuestions: qs.length,
      };
    }
    const mySubs = new Set(db.getStudentSubjectIds(studentId));
    return (
      state.assessments.find((a) => a.id === id && mySubs.has(a.subjectId)) ||
      state.assessments.find((a) => a.conceptId === id && mySubs.has(a.subjectId)) ||
      state.assessments.find((a) => a.subjectId === id && mySubs.has(a.subjectId))
    );
  };

  // =================== AUTH ROUTES ===================
  app.get('/api/auth/current-user', (req, res) => {
    const state = db.getState();
    const user = state.users.find((u) => u.id === uid(req));
    if (!user) {
      return res.json({ user: null, profile: null });
    }
    const profile =
      user.role === 'STUDENT'
        ? state.studentProfiles.find((p) => p.userId === user.id)
        : state.teacherProfiles.find((p) => p.userId === user.id);

    res.json({ user: publicUser(user), profile });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db
      .getState()
      .users.find((u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase());
    if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = startSession(res, user.id);
    res.json({ success: true, token, user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    endSession(req, res);
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.delete('/api/auth/profile', (req, res) => {
    const state = db.getState();
    const deletedUserId = uid(req);
    state.classMembers = state.classMembers.filter((m) => m.studentId !== deletedUserId);
    state.users = state.users.filter((u) => u.id !== deletedUserId);
    state.studentProfiles = state.studentProfiles.filter((p) => p.userId !== deletedUserId);
    state.learningTwins = state.learningTwins.filter((t) => t.studentId !== deletedUserId);
    state.knowledgeGaps = state.knowledgeGaps.filter((g) => g.studentId !== deletedUserId);
    db.save();

    endSession(req, res);
    res.json({ success: true, message: 'Profile deleted successfully' });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role, department, yearSemester, college } = req.body;
    const state = db.getState();
    const cleanEmail = String(email || '').trim();
    if (!name || !cleanEmail || !password || String(password).length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'Name, email and a password of at least 6 characters are required' });
    }
    if (state.users.some((u) => u.email.toLowerCase() === cleanEmail.toLowerCase())) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    const newId = `usr_${Date.now()}`;
    const userRole = role === 'TEACHER' ? ('TEACHER' as const) : ('STUDENT' as const);
    const newUser = {
      id: newId,
      name,
      email: cleanEmail,
      role: userRole,
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };
    state.users.push(newUser);
    const token = startSession(res, newUser.id);

    let profile: any;
    if (userRole === 'STUDENT') {
      profile = {
        id: `prof_${newId}`,
        userId: newId,
        department: department || '',
        yearSemester: yearSemester || '',
        college: college || '',
        learningMode: 'Visual' as const,
        studyConsistency: 'Low' as const,
        avgSessionMinutes: 0,
        learningStreakDays: 0,
      };
      state.studentProfiles.push(profile);
      updateTwinMastery(newId);
    } else {
      profile = {
        id: `prof_${newId}`,
        userId: newId,
        department: department || '',
        title: '',
        institution: college || '',
      };
      state.teacherProfiles.push(profile);
    }
    db.save();

    res.json({ success: true, token, user: publicUser(newUser), profile });
  });

  app.post('/api/auth/onboarding', (req, res) => {
    const { name, department, yearSemester, college, learningMode, goals, avatarUrl } = req.body;
    const state = db.getState();

    const user = state.users.find((u) => u.id === uid(req));
    if (user && name) user.name = name;
    if (user && typeof avatarUrl === 'string') user.avatarUrl = avatarUrl || undefined;

    const profile = state.studentProfiles.find((p) => p.userId === uid(req));
    if (profile) {
      if (department) profile.department = department;
      if (yearSemester) profile.yearSemester = yearSemester;
      if (college) profile.college = college;
      if (learningMode) profile.learningMode = learningMode;
    }

    if (goals && goals.length > 0) {
      const goal = state.learningGoals.find((g) => g.studentId === uid(req));
      if (goal) {
        goal.title = goals;
      }
    }

    db.save();
    res.json({ success: true, user: user ? publicUser(user) : null, profile });
  });


  // =================== CLASSROOMS ===================
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

  const genCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const state = db.getState();
    for (; ;) {
      const code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
      if (!state.classrooms.some((c) => c.code === code)) return code;
    }
  };

  const extractText = async (name: string, mime: string, buf: Buffer): Promise<string> => {
    const ext = path.extname(name).toLowerCase();
    try {
      if (['.txt', '.md', '.csv', '.tex', '.json'].includes(ext) || mime.startsWith('text/plain') || mime === 'text/markdown') {
        return buf.toString('utf-8');
      }
      if (['.html', '.htm'].includes(ext)) return buf.toString('utf-8').replace(/<[^>]+>/g, ' ');
      if (ext === '.pdf') {
        const mod: any = await import('pdf-parse/lib/pdf-parse.js');
        return (await (mod.default || mod)(buf)).text || '';
      }
      if (ext === '.docx') {
        const mod: any = await import('mammoth');
        return (await (mod.default || mod).extractRawText({ buffer: buf })).value || '';
      }
    } catch (err) {
      console.error('Text extraction failed:', err);
    }
    return '';
  };

  const ensureConceptAssessment = (conceptId: string) => {
    const state = db.getState();
    const concept = state.concepts.find((c) => c.id === conceptId);
    if (!concept) return;
    const qids = state.questions.filter((q) => q.conceptId === conceptId).map((q) => q.id);
    const id = `asmt_${conceptId}`;
    const existing = state.assessments.find((a) => a.id === id);
    if (qids.length === 0) {
      if (existing) state.assessments = state.assessments.filter((a) => a.id !== id);
      return;
    }
    if (existing) {
      existing.questionIds = qids;
      existing.totalQuestions = qids.length;
    } else {
      state.assessments.push({
        id,
        title: `${concept.name} Practice`,
        type: 'ADAPTIVE',
        subjectId: concept.subjectId,
        conceptId,
        questionIds: qids,
        totalQuestions: qids.length,
      });
    }
  };

  const ownClass = (req: any, id: string) =>
    db.getState().classrooms.find((c) => c.id === id && c.teacherId === uid(req));

  const classView = (cls: any, forTeacher: boolean) => {
    const state = db.getState();
    const teacher = state.users.find((u) => u.id === cls.teacherId);
    const subjects = cls.subjectIds
      .map((sid: string) => state.subjects.find((x) => x.id === sid))
      .filter(Boolean)
      .map((sub: any) => ({
        ...sub,
        editable: sub.ownerId === cls.teacherId && sub.classId === cls.id,
        topics: state.topics
          .filter((t) => t.subjectId === sub.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((t) => ({
            ...t,
            conceptIds: state.concepts.filter((c) => c.topicId === t.id).map((c) => c.id),
            questionCount: state.questions.filter((q) =>
              state.concepts.some((c) => c.topicId === t.id && c.id === q.conceptId)
            ).length,
          })),
      }));
    const files = state.studyFiles.filter((f) => f.classId === cls.id);
    const base: any = { id: cls.id, code: cls.code, name: cls.name, teacherName: teacher?.name || '', subjects, files, createdAt: cls.createdAt };
    if (forTeacher) {
      base.students = state.classMembers
        .filter((m) => m.classId === cls.id)
        .map((m) => {
          const u = state.users.find((x) => x.id === m.studentId);
          const twin = state.learningTwins.find((t) => t.studentId === m.studentId);
          return { studentId: m.studentId, name: u?.name || '', email: u?.email || '', mastery: twin?.overallMastery || 0, joinedAt: m.joinedAt };
        });
    }
    return base;
  };

  app.get('/api/classes', (req, res) => {
    const state = db.getState();
    if (roleOf(req) === 'TEACHER') {
      return res.json(state.classrooms.filter((c) => c.teacherId === uid(req)).map((c) => classView(c, true)));
    }
    const ids = new Set(db.getStudentClassIds(uid(req)));
    res.json(state.classrooms.filter((c) => ids.has(c.id)).map((c) => classView(c, false)));
  });

  app.get('/api/catalog', (req, res) => {
    if (roleOf(req) !== 'TEACHER') return res.status(403).json({ error: 'teacher only' });
    const state = db.getState();
    res.json(state.subjects.filter((s) => !s.classId).map((s) => ({ id: s.id, name: s.name, code: s.code, description: s.description })));
  });

  app.post('/api/classes', (req, res) => {
    if (roleOf(req) !== 'TEACHER') return res.status(403).json({ error: 'teacher only' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Class name required' });
    const state = db.getState();
    const cls = { id: `cls_${Date.now()}`, code: genCode(), name, teacherId: uid(req), subjectIds: [] as string[], createdAt: new Date().toISOString() };
    state.classrooms.push(cls);
    db.save();
    res.json(classView(cls, true));
  });

  app.delete('/api/classes/:id', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const own = state.subjects.filter((s) => s.classId === cls.id).map((s) => s.id);
    own.forEach((sid) => removeSubjectData(sid));
    state.studyFiles.filter((f) => f.classId === cls.id).forEach((f) => removeFileBlob(f.id));
    state.studyFiles = state.studyFiles.filter((f) => f.classId !== cls.id);
    state.classMembers = state.classMembers.filter((m) => m.classId !== cls.id);
    state.classrooms = state.classrooms.filter((c) => c.id !== cls.id);
    db.save();
    res.json({ success: true });
  });

  app.post('/api/classes/join', (req, res) => {
    if (roleOf(req) !== 'STUDENT') return res.status(403).json({ error: 'students only' });
    const code = String(req.body.code || '').trim().toUpperCase();
    const state = db.getState();
    const cls = state.classrooms.find((c) => c.code === code);
    if (!cls) return res.status(404).json({ error: 'No class found with that code' });
    if (!state.classMembers.some((m) => m.classId === cls.id && m.studentId === uid(req))) {
      state.classMembers.push({ id: `mem_${Date.now()}`, classId: cls.id, studentId: uid(req), joinedAt: new Date().toISOString() });
      updateTwinMastery(uid(req));
      db.save();
    }
    res.json(classView(cls, false));
  });

  app.post('/api/classes/:id/leave', (req, res) => {
    const state = db.getState();
    state.classMembers = state.classMembers.filter((m) => !(m.classId === req.params.id && m.studentId === uid(req)));
    updateTwinMastery(uid(req));
    db.save();
    res.json({ success: true });
  });

  const removeFileBlob = (fileId: string) => {
    for (const ext of ['', '.txt']) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, fileId + ext));
      } catch {
        // already gone
      }
    }
  };

  const removeSubjectData = (subjectId: string) => {
    const state = db.getState();
    const cids = new Set(state.concepts.filter((c) => c.subjectId === subjectId).map((c) => c.id));
    state.questions = state.questions.filter((q) => !cids.has(q.conceptId));
    state.assessments = state.assessments.filter((a) => a.subjectId !== subjectId);
    state.prerequisites = state.prerequisites.filter((p) => !cids.has(p.conceptId) && !cids.has(p.prerequisiteConceptId));
    state.learningTwinConcepts = state.learningTwinConcepts.filter((t) => !cids.has(t.conceptId));
    state.knowledgeGaps = state.knowledgeGaps.filter((g) => !cids.has(g.conceptId));
    state.retentionRecords = state.retentionRecords.filter((r) => !cids.has(r.conceptId));
    state.concepts = state.concepts.filter((c) => c.subjectId !== subjectId);
    state.topics = state.topics.filter((t) => t.subjectId !== subjectId);
    state.subjects = state.subjects.filter((s) => s.id !== subjectId);
    state.classrooms.forEach((c) => (c.subjectIds = c.subjectIds.filter((s) => s !== subjectId)));
  };

  app.post('/api/classes/:id/subjects', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const { catalogSubjectId } = req.body;
    if (catalogSubjectId) {
      const sub = state.subjects.find((s) => s.id === catalogSubjectId && !s.classId);
      if (!sub) return res.status(404).json({ error: 'Subject not found' });
      if (!cls.subjectIds.includes(sub.id)) cls.subjectIds.push(sub.id);
    } else {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Subject name required' });
      const colors = ['#6366f1', '#ec4899', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
      const sub = {
        id: `sub_${Date.now()}`,
        name,
        code: String(req.body.code || '').trim(),
        description: String(req.body.description || '').trim(),
        iconName: 'BookOpen',
        color: colors[state.subjects.length % colors.length],
        ownerId: uid(req),
        classId: cls.id,
      };
      state.subjects.push(sub);
      cls.subjectIds.push(sub.id);
    }
    db.save();
    res.json(classView(cls, true));
  });

  app.delete('/api/classes/:id/subjects/:subjectId', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const sub = state.subjects.find((s) => s.id === req.params.subjectId);
    if (sub?.classId === cls.id) removeSubjectData(sub.id);
    else cls.subjectIds = cls.subjectIds.filter((s) => s !== req.params.subjectId);
    db.save();
    res.json(classView(cls, true));
  });

  app.post('/api/classes/:id/subjects/:subjectId/topics', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const sub = state.subjects.find((s) => s.id === req.params.subjectId && s.classId === cls.id);
    if (!sub) return res.status(404).json({ error: 'Subject not editable' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Topic name required' });
    const existing = state.topics.filter((t) => t.subjectId === sub.id);
    const topic = {
      id: `top_${Date.now()}`,
      subjectId: sub.id,
      name,
      description: String(req.body.description || '').trim(),
      orderIndex: existing.length,
    };
    const concept = {
      id: `c_${topic.id}`,
      topicId: topic.id,
      subjectId: sub.id,
      name,
      description: topic.description,
      difficulty: 'Beginner' as const,
      estimatedMinutes: 20,
      summaryNotes: String(req.body.notes || '').trim(),
    };
    state.topics.push(topic);
    state.concepts.push(concept);
    const prev = existing.sort((a, b) => a.orderIndex - b.orderIndex).pop();
    const prevConcept = prev && state.concepts.find((c) => c.topicId === prev.id);
    if (prevConcept) {
      state.prerequisites.push({
        id: `pre_${concept.id}`,
        conceptId: concept.id,
        prerequisiteConceptId: prevConcept.id,
        relationshipType: 'DIRECT',
        minimumMasteryThreshold: 60,
      });
    }
    db.save();
    res.json(classView(cls, true));
  });

  app.delete('/api/classes/:id/topics/:topicId', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const topic = state.topics.find((t) => t.id === req.params.topicId);
    const sub = topic && state.subjects.find((s) => s.id === topic.subjectId && s.classId === cls.id);
    if (!topic || !sub) return res.status(404).json({ error: 'Topic not editable' });
    const cids = new Set(state.concepts.filter((c) => c.topicId === topic.id).map((c) => c.id));
    state.questions = state.questions.filter((q) => !cids.has(q.conceptId));
    cids.forEach((cid) => (state.assessments = state.assessments.filter((a) => a.id !== `asmt_${cid}`)));
    // Re-link prerequisite chain around the removed concept
    const incoming = state.prerequisites.filter((p) => cids.has(p.conceptId));
    const outgoing = state.prerequisites.filter((p) => cids.has(p.prerequisiteConceptId));
    incoming.forEach((i) =>
      outgoing.forEach((o) =>
        state.prerequisites.push({ ...o, id: `pre_${o.conceptId}`, prerequisiteConceptId: i.prerequisiteConceptId })
      )
    );
    state.prerequisites = state.prerequisites.filter((p) => !cids.has(p.conceptId) && !cids.has(p.prerequisiteConceptId));
    state.learningTwinConcepts = state.learningTwinConcepts.filter((t) => !cids.has(t.conceptId));
    state.knowledgeGaps = state.knowledgeGaps.filter((g) => !cids.has(g.conceptId));
    state.retentionRecords = state.retentionRecords.filter((r) => !cids.has(r.conceptId));
    state.concepts = state.concepts.filter((c) => c.topicId !== topic.id);
    state.topics = state.topics.filter((t) => t.id !== topic.id);
    state.studyFiles.forEach((f) => {
      if (f.topicId === topic.id) {
        f.topicId = undefined;
        f.conceptId = undefined;
        f.questionsGenerated = 0;
      }
    });
    db.save();
    res.json(classView(cls, true));
  });

  app.post('/api/classes/:id/questions', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const concept = state.concepts.find(
      (c) => c.topicId === req.body.topicId && state.subjects.some((s) => s.id === c.subjectId && s.classId === cls.id)
    );
    const options: string[] = Array.isArray(req.body.options) ? req.body.options.map((o: any) => String(o).trim()).filter(Boolean) : [];
    const correct = String(req.body.correctAnswer || '').trim();
    if (!concept || !req.body.question || options.length < 2 || !options.includes(correct)) {
      return res.status(400).json({ error: 'Topic, question, 2+ options and a matching correct answer required' });
    }
    state.questions.push({
      id: `q_t_${Date.now()}`,
      conceptId: concept.id,
      difficulty: 'Medium',
      question: String(req.body.question).trim(),
      options,
      correctAnswer: correct,
      explanation: String(req.body.explanation || '').trim() || `Correct answer: ${correct}`,
    });
    ensureConceptAssessment(concept.id);
    db.save();
    res.json(classView(cls, true));
  });

  app.post('/api/classes/:id/files', async (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const { name, mimeType = '', dataBase64, topicId } = req.body;
    if (!name || typeof dataBase64 !== 'string') return res.status(400).json({ error: 'name and dataBase64 required' });
    const buf = Buffer.from(dataBase64, 'base64');
    if (buf.length === 0 || buf.length > MAX_FILE_BYTES) return res.status(400).json({ error: 'File empty or larger than 15 MB' });

    let concept: any;
    if (topicId) {
      concept = state.concepts.find(
        (c) => c.topicId === topicId && state.subjects.some((s) => s.id === c.subjectId && s.classId === cls.id)
      );
      if (!concept) return res.status(400).json({ error: 'Topic must belong to one of your own subjects' });
    }

    const fileId = `file_${Date.now()}`;
    const text = await extractText(String(name), String(mimeType), buf);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, fileId), buf);
    if (text.trim()) fs.writeFileSync(path.join(UPLOAD_DIR, `${fileId}.txt`), text, 'utf-8');

    let generated = 0;
    if (concept && text.trim()) {
      const qs =
        (await generateQuizFromMaterial(text, concept, `q_${fileId}`, 10)) ||
        generateQuestionsFromText(text, concept.id, `q_${fileId}`, 8);
      state.questions.push(...qs);
      generated = qs.length;
      ensureConceptAssessment(concept.id);
    }
    state.studyFiles.push({
      id: fileId,
      classId: cls.id,
      topicId: concept ? topicId : undefined,
      conceptId: concept?.id,
      name: String(name),
      mimeType: String(mimeType),
      size: buf.length,
      hasText: Boolean(text.trim()),
      questionsGenerated: generated,
      uploadedAt: new Date().toISOString(),
    });
    db.save();
    res.json(classView(cls, true));
  });

  app.delete('/api/classes/:id/files/:fileId', (req, res) => {
    const cls = ownClass(req, req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const state = db.getState();
    const file = state.studyFiles.find((f) => f.id === req.params.fileId && f.classId === cls.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    state.questions = state.questions.filter((q) => !q.id.startsWith(`q_${file.id}_`));
    if (file.conceptId) ensureConceptAssessment(file.conceptId);
    removeFileBlob(file.id);
    state.studyFiles = state.studyFiles.filter((f) => f.id !== file.id);
    db.save();
    res.json(classView(cls, true));
  });

  app.get('/api/files/:fileId', (req, res) => {
    const state = db.getState();
    const file = state.studyFiles.find((f) => f.id === req.params.fileId);
    const cls = file && state.classrooms.find((c) => c.id === file.classId);
    const allowed =
      cls && (cls.teacherId === uid(req) || state.classMembers.some((m) => m.classId === cls.id && m.studentId === uid(req)));
    if (!file || !allowed) return res.status(404).json({ error: 'File not found' });
    const full = path.join(UPLOAD_DIR, file.id);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'File missing' });
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.sendFile(full);
  });

  // =================== CONCEPTS & GRAPH API ===================
  app.get('/api/concepts', (req, res) => {
    const state = db.getState();
    const subjectId = req.query.subjectId as string;
    const concepts = state.concepts.filter((c) => !subjectId || c.subjectId === subjectId);
    res.json(concepts);
  });

  app.get('/api/concepts/:id', (req, res) => {
    const state = db.getState();
    const concept = state.concepts.find((c) => c.id === req.params.id);
    if (!concept) {
      return res.status(404).json({ error: 'Concept not found' });
    }
    const prereqs = state.prerequisites.filter((p) => p.conceptId === concept.id);
    res.json({ concept, prerequisites: prereqs });
  });

  // =================== LEARNER STATE & TWIN ===================
  app.get('/api/learning-twin', (req, res) => {
    const studentId = uid(req);
    const twin = updateTwinMastery(studentId);
    const profile = db.getStudentProfile(studentId);
    const retentionData = calculateRetentionHealth(studentId);
    const gaps = detectKnowledgeGaps(studentId);
    const currentDecision = db.getStudentClassIds(studentId).length ? evaluateNextAction({ studentId }) : null;

    res.json({
      twin,
      profile,
      retentionHealth: retentionData.overallRetentionHealth,
      activeGapsCount: gaps.length,
      currentDecision,
    });
  });

  app.get('/api/learning-twin/concepts', (req, res) => {
    const studentId = uid(req);
    const state = db.getState();
    const twinConcepts = state.learningTwinConcepts.filter((c) => c.studentId === studentId);
    const concepts = db.getStudentConcepts(studentId).map((c) => {
      const tc = twinConcepts.find((item) => item.conceptId === c.id);
      return {
        ...c,
        masteryScore: tc ? tc.masteryScore : 0,
        uncertainty: tc ? tc.uncertainty : 'High',
        status: tc ? tc.status : 'Not Learned',
        confidenceLevel: tc ? tc.confidenceLevel : 0,
        attemptsCount: tc ? tc.attemptsCount : 0,
        forgettingRisk: tc ? tc.forgettingRisk : 'Low',
        transferScore: tc ? tc.transferScore : 0,
      };
    });
    res.json(concepts);
  });

  app.get('/api/learner/:studentId/state', (req, res) => {
    const studentId = resolveStudent(req, req.params.studentId);
    const state = db.getState();
    const twin = updateTwinMastery(studentId);
    const concepts = state.learningTwinConcepts.filter((tc) => tc.studentId === studentId);
    const gaps = detectKnowledgeGaps(studentId);
    const retention = calculateRetentionHealth(studentId);
    const decision = db.getStudentClassIds(studentId).length ? evaluateNextAction({ studentId }) : null;

    res.json({
      studentId,
      overallTwin: twin,
      concepts,
      knowledgeGaps: gaps,
      retentionHealth: retention.overallRetentionHealth,
      currentDecision: decision,
    });
  });

  app.get('/api/learner/:studentId/evidence', (req, res) => {
    const studentId = resolveStudent(req, req.params.studentId);
    const conceptId = req.query.conceptId as string;
    const evidences = getStudentEvidence(studentId, conceptId);
    res.json(evidences);
  });

  app.get('/api/learner/:studentId/decisions', (req, res) => {
    const studentId = resolveStudent(req, req.params.studentId);
    const state = db.getState();
    const records = (state.decisionRecords || []).filter((d) => d.studentId === studentId);
    res.json(records);
  });

  // =================== KNOWLEDGE GRAPH ===================
  app.get('/api/knowledge-graph', (req, res) => {
    const studentId = uid(req);
    const state = db.getState();
    const mySubjects = db.getStudentSubjects(studentId);
    const requested = req.query.subjectId as string;
    const subjectId = mySubjects.some((x) => x.id === requested) ? requested : mySubjects[0]?.id || '';

    const concepts = db.getStudentConcepts(studentId).filter((c) => c.subjectId === subjectId);
    const twinConcepts = state.learningTwinConcepts.filter((tc) => tc.studentId === studentId);
    const gaps = state.knowledgeGaps.filter((g) => g.studentId === studentId && g.status !== 'RESOLVED');

    const nodes = concepts.map((c) => {
      const tc = twinConcepts.find((item) => item.conceptId === c.id);
      const isGap = gaps.some((g) => g.conceptId === c.id);

      let status = tc ? tc.status : 'Not Learned';
      if (isGap) status = 'Gap';

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        difficulty: c.difficulty,
        topicId: c.topicId,
        parentConceptId: c.parentConceptId,
        masteryScore: tc ? tc.masteryScore : 0,
        uncertainty: tc ? tc.uncertainty : 'High',
        status,
      };
    });

    const edges = state.prerequisites
      .filter((p) => concepts.some((c) => c.id === p.conceptId) && concepts.some((c) => c.id === p.prerequisiteConceptId))
      .map((p) => ({
        id: p.id,
        source: p.prerequisiteConceptId,
        target: p.conceptId,
        type: p.relationshipType,
      }));

    res.json({
      subjectId,
      nodes,
      edges,
      subjects: mySubjects,
    });
  });

  // =================== KNOWLEDGE GAPS ===================
  app.get('/api/knowledge-gaps', (req, res) => {
    const studentId = uid(req);
    const gaps = detectKnowledgeGaps(studentId);
    res.json(gaps);
  });

  // =================== ADAPTIVE LEARNING PATH ===================
  app.get('/api/learning-path', (req, res) => {
    const studentId = uid(req);
    const path = generateAdaptiveLearningPath(studentId);
    res.json(path);
  });

  // =================== RETENTION & REVISION ===================
  app.get('/api/retention', (req, res) => {
    const studentId = uid(req);
    const data = calculateRetentionHealth(studentId);
    const schedule = (data.records || []).map((r) => ({
      conceptId: r.conceptId,
      conceptName: r.conceptName,
      retentionStatus: r.status,
      predictedRetentionScore: r.masteryScore,
      daysSincePractice: r.daysSincePractice,
      recommendedReviewDate: r.nextScheduledReview,
    }));
    res.json({
      ...data,
      schedule,
    });
  });

  app.post('/api/retention/practice', (req, res) => {
    const { conceptId } = req.body;
    const studentId = uid(req);
    recordPracticeSession(studentId, conceptId);
    const data = calculateRetentionHealth(studentId);
    const schedule = (data.records || []).map((r) => ({
      conceptId: r.conceptId,
      conceptName: r.conceptName,
      retentionStatus: r.status,
      predictedRetentionScore: r.masteryScore,
      daysSincePractice: r.daysSincePractice,
      recommendedReviewDate: r.nextScheduledReview,
    }));
    res.json({ success: true, ...data, schedule });
  });

  // =================== CORE ATTEMPT PIPELINE ===================
  // POST /api/attempts: Process evidence -> Anti-Gaming -> Update Mastery -> Uncertainty -> Prereq -> Gaps -> Decision Engine
  app.post('/api/attempts', (req, res) => {
    const {
      conceptId,
      questionId,
      selectedOption,
      confidence,
      responseTimeMs,
      hintsUsed,
      sessionId,
      isRetry,
      isTransferQuestion,
    } = req.body;

    const studentId = uid(req);
    if (!db.getStudentConcepts(studentId).some((c) => c.id === conceptId)) {
      return res.status(403).json({ error: 'Concept not in your classes' });
    }
    if (!conceptId || !questionId || selectedOption === undefined) {
      return res.status(400).json({ error: 'Missing required attempt fields' });
    }

    // 1. Record and validate AttemptEvidence with Anti-Gaming analysis
    const attemptResult = recordAttemptEvidence({
      studentId,
      conceptId,
      questionId,
      selectedOption,
      confidence,
      responseTimeMs,
      hintsUsed,
      sessionId,
      isRetry,
      isTransferQuestion,
    });

    // 2. Update Mastery and Uncertainty deterministically
    const masteryResult = updateConceptMasteryFromEvidence({
      studentId,
      conceptId,
      latestEvidence: attemptResult.evidence,
    });

    // 3. Update Knowledge Gaps & Retention
    detectKnowledgeGaps(studentId);
    calculateRetentionHealth(studentId);

    // 4. Run Explainable Next-Action Decision Engine
    const decision = evaluateNextAction({
      studentId,
      focusConceptId: conceptId,
      latestEvidence: attemptResult.evidence,
    });

    res.json({
      success: true,
      attemptEvidence: attemptResult.evidence,
      isCorrect: attemptResult.isCorrect,
      antiGaming: attemptResult.antiGaming,
      masteryUpdate: masteryResult,
      decision,
    });
  });

  // =================== COLD-START DIAGNOSTIC ===================
  app.post('/api/diagnostic/submit', (req, res) => {
    const { answers, confidenceMap, responseTimeMap, hintsMap } = req.body;
    const studentId = uid(req);
    const state = db.getState();

    const diagnosticQuestions = buildDiagnostic(studentId);
    const results: any[] = [];
    let correctCount = 0;

    diagnosticQuestions.forEach((q) => {
      const chosen = answers ? answers[q.id] : undefined;
      const conf = confidenceMap ? confidenceMap[q.id] : 'Medium';
      const respTime = responseTimeMap ? responseTimeMap[q.id] : 14000;
      const hints = hintsMap ? hintsMap[q.id] : 0;

      if (chosen !== undefined) {
        const att = recordAttemptEvidence({
          studentId,
          conceptId: q.conceptId,
          questionId: q.id,
          selectedOption: chosen,
          confidence: conf,
          responseTimeMs: respTime,
          hintsUsed: hints,
          questionType: 'DIAGNOSTIC',
        });

        if (att.isCorrect) correctCount += 1;

        updateConceptMasteryFromEvidence({
          studentId,
          conceptId: q.conceptId,
          latestEvidence: att.evidence,
        });

        results.push(att);
      }
    });

    detectKnowledgeGaps(studentId);
    calculateRetentionHealth(studentId);
    const updatedTwin = updateTwinMastery(studentId);

    // Generate initial explainable decision
    const firstDecision = evaluateNextAction({ studentId });

    res.json({
      success: true,
      totalQuestions: diagnosticQuestions.length,
      correctCount,
      overallMastery: updatedTwin.overallMastery,
      twin: updatedTwin,
      firstDecision,
    });
  });

  // =================== DECISION ENGINE ROUTES ===================
  app.get('/api/next-action/:studentId', (req, res) => {
    const studentId = resolveStudent(req, req.params.studentId);
    const focusConceptId = req.query.conceptId as string;
    const decision = evaluateNextAction({ studentId, focusConceptId });
    res.json(decision);
  });

  app.get('/api/decision/:decisionId', (req, res) => {
    const state = db.getState();
    const decision = (state.decisionRecords || []).find((d) => d.id === req.params.decisionId);
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    res.json(decision);
  });

  app.post('/api/decision/replay', (req, res) => {
    const { decisionId } = req.body;
    const replayed = replayDecision(decisionId);
    if (!replayed) {
      return res.status(404).json({ error: 'Could not replay decision' });
    }
    res.json({ success: true, replayedDecision: replayed });
  });

  // =================== TEACHER OVERRIDES & AUDIT ===================
  app.post('/api/teacher/override', (req, res) => {
    const { studentId, conceptId, originalAction, overriddenAction, reason, decisionId } = req.body;
    if (!conceptId || !reason) return res.status(400).json({ success: false, message: 'conceptId and reason are required' });
    const override = createTeacherOverride({
      studentId: studentId,
      conceptId,
      teacherId: uid(req),
      originalAction,
      overriddenAction,
      reason,
      decisionId,
    });

    const updatedDecision = evaluateNextAction({
      studentId: studentId,
      focusConceptId: conceptId,
    });

    res.json({ success: true, override, updatedDecision });
  });

  app.get('/api/teacher/overrides', (req, res) => {
    const studentId = req.query.studentId as string;
    const overrides = getTeacherOverrides(studentId);
    res.json(overrides);
  });

  app.delete('/api/teacher/override/:id', (req, res) => {
    const success = revokeTeacherOverride(req.params.id);
    res.json({ success });
  });

  app.get('/api/teacher/audit', (req, res) => {
    const state = db.getState();
    res.json({
      overrides: state.teacherOverrides || [],
      recentDecisions: (state.decisionRecords || []).slice(-30),
      interventions: state.interventions || [],
    });
  });

  // =================== TWO-LEARNER SIMULATION & STRESS TESTS ===================
  app.get('/api/simulation/two-learners', (req, res) => {
    const simResult = runTwoLearnerSimulation();
    res.json(simResult);
  });

  app.get('/api/simulation/stress-tests', (req, res) => {
    const testResults = runJudgeStressTests();
    const passedCount = testResults.filter((t) => t.passed).length;
    res.json({
      totalTests: testResults.length,
      passedCount,
      allPassed: passedCount === testResults.length,
      tests: testResults,
    });
  });

  // =================== ASSESSMENTS ===================
  app.get('/api/assessments', (req, res) => {
    const { subjectId, conceptId } = req.query;
    const state = db.getState();
    const mySubs = new Set(db.getStudentSubjectIds(uid(req)));
    let list = state.assessments.filter((a) => mySubs.has(a.subjectId));
    if (subjectId) {
      list = list.filter((a) => a.subjectId === subjectId);
    }
    if (conceptId) {
      list = list.filter((a) => a.conceptId === conceptId || a.id.includes(conceptId as string));
    }
    res.json({ assessments: list, subjects: db.getStudentSubjects(uid(req)) });
  });

  app.get('/api/assessment/:id', async (req, res) => {
    const { id } = req.params;
    const state = db.getState();
    const studentId = uid(req);
    const assessment = findAssessment(studentId, id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    let questions: typeof state.questions;
    if (assessment.conceptId) {
      if ((await ensureFreshQuestions(studentId, assessment.conceptId)) > 0) {
        ensureConceptAssessment(assessment.conceptId);
        db.save();
      }
      questions = pickQuizSet(
        studentId,
        state.questions.filter((q) => q.conceptId === assessment.conceptId),
        8
      );
    } else {
      const questionsById = new Map(state.questions.map((q) => [q.id, q]));
      questions = assessment.questionIds
        .map((qid) => questionsById.get(qid))
        .filter((q): q is (typeof state.questions)[number] => Boolean(q));
    }
    res.json({ assessment, questions });
  });

  app.post('/api/assessment/submit', (req, res) => {
    const {
      assessmentId,
      answers = {},
      confidenceMap = {},
      responseTimeMsMap = {},
      hintsUsedMap = {},
    } = req.body;
    const studentId = uid(req);
    const state = db.getState();

    const assessment = findAssessment(studentId, assessmentId);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const questionsById = new Map(state.questions.map((q) => [q.id, q]));
    const questions = assessment.questionIds
      .map((qid) => questionsById.get(qid))
      .filter((q): q is (typeof state.questions)[number] => Boolean(q));

    let correctCount = 0;
    const breakdown: any[] = [];
    const modifiedConcepts = new Set<string>();

    questions.forEach((q) => {
      const chosen = answers ? answers[q.id] : undefined;
      const conf = confidenceMap ? confidenceMap[q.id] : 'Medium';
      const respTime = responseTimeMsMap ? responseTimeMsMap[q.id] : 14000;
      const hints = hintsUsedMap ? hintsUsedMap[q.id] : 0;

      if (chosen !== undefined) {
        const att = recordAttemptEvidence({
          studentId,
          conceptId: q.conceptId,
          questionId: q.id,
          selectedOption: chosen,
          confidence: conf,
          responseTimeMs: respTime,
          hintsUsed: hints,
          isTransferQuestion: q.isTransferQuestion,
        });

        if (att.isCorrect) correctCount += 1;
        modifiedConcepts.add(q.conceptId);

        updateConceptMasteryFromEvidence({
          studentId,
          conceptId: q.conceptId,
          latestEvidence: att.evidence,
        });

        breakdown.push({
          questionId: q.id,
          question: q.question,
          chosenOption: chosen || 'Not Answered',
          correctAnswer: q.correctAnswer,
          isCorrect: att.isCorrect,
          explanation: q.explanation,
          difficulty: q.difficulty,
          antiGaming: att.antiGaming,
        });
      }
    });

    const totalQ = questions.filter((q) => answers && answers[q.id] !== undefined).length || 1;
    const scorePercentage = Math.round((correctCount / totalQ) * 100);

    const attempt = {
      id: `att_${Date.now()}`,
      studentId,
      assessmentId: assessment.id,
      score: scorePercentage,
      totalQuestions: totalQ,
      correctAnswersCount: correctCount,
      answers,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'COMPLETED' as const,
    };
    state.assessmentAttempts.push(attempt);

    detectKnowledgeGaps(studentId);
    calculateRetentionHealth(studentId);
    const updatedTwin = updateTwinMastery(studentId);

    // Run Decision Engine
    const targetConceptId = Array.from(modifiedConcepts)[0] || assessment.conceptId;
    const decision = evaluateNextAction({
      studentId,
      focusConceptId: targetConceptId,
    });

    db.save();

    res.json({
      success: true,
      score: scorePercentage,
      correctCount,
      totalQuestions: totalQ,
      twin: updatedTwin,
      breakdown,
      decision,
    });
  });

  // =================== AI TUTOR ===================
  app.get('/api/tutor/history', (req, res) => {
    const studentId = uid(req);
    const conceptId = req.query.conceptId as string;
    const state = db.getState();
    if (!conceptId) return res.json({ conversation: null, messages: [] });

    let conv = state.tutorConversations.find((c) => c.studentId === studentId && c.conceptId === conceptId);
    if (!conv) {
      const concept = state.concepts.find((c) => c.id === conceptId);
      conv = {
        id: `conv_${Date.now()}`,
        studentId,
        conceptId,
        conceptName: concept?.name || conceptId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.tutorConversations.push(conv);
      db.save();
    }

    const messages = state.tutorMessages.filter((m) => m.conversationId === conv.id);
    res.json({ conversation: conv, messages });
  });

  app.post('/api/tutor/message', async (req, res) => {
    try {
      const { conceptId, message, action } = req.body;
      if (!conceptId) return res.status(400).json({ error: 'conceptId is required' });
      const studentId = uid(req);
      const state = db.getState();

      let conv = state.tutorConversations.find((c) => c.studentId === studentId && c.conceptId === conceptId);
      if (!conv) {
        const concept = state.concepts.find((c) => c.id === conceptId);
        conv = {
          id: `conv_${Date.now()}`,
          studentId,
          conceptId,
          conceptName: concept?.name || conceptId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.tutorConversations.push(conv);
      }

      const userMsg = {
        id: `msg_${Date.now()}_u`,
        conversationId: conv.id,
        sender: 'USER' as const,
        content: typeof message === 'string' ? message : '',
        actionUsed: action,
        timestamp: new Date().toISOString(),
      };
      state.tutorMessages.push(userMsg);

      // Call server-side Gemini tutor
      const replyText = await generateTutorResponse({
        studentId,
        conceptId,
        userMessage: userMsg.content,
        action,
        history: state.tutorMessages.filter((m) => m.conversationId === conv.id),
      });

      const tutorMsg = {
        id: `msg_${Date.now()}_t`,
        conversationId: conv.id,
        sender: 'TUTOR' as const,
        content: replyText,
        actionUsed: action,
        timestamp: new Date().toISOString(),
      };
      state.tutorMessages.push(tutorMsg);
      conv.updatedAt = new Date().toISOString();
      db.save();

      res.json({ userMessage: userMsg, tutorMessage: tutorMsg });
    } catch (err) {
      console.error('POST /api/tutor/message failed:', err);
      res.status(200).json({
        tutorMessage: {
          id: `msg_${Date.now()}_t`,
          conversationId: 'active',
          sender: 'TUTOR' as const,
          content:
            "I'm here to support your mastery of this concept. Let's break down the underlying prerequisites step by step.",
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  // =================== TEACHER ROUTES ===================
  app.get('/api/teacher/dashboard', (req, res) => {
    const cohortAnalytics = getLiveCohortAnalytics(uid(req));
    res.json(cohortAnalytics);
  });

  app.get('/api/teacher/students', (req, res) => {
    const state = db.getState();
    const formatted = buildLiveStudents(uid(req)).map((ts) => ({
      ...ts,
      gaps: ts.knowledgeGaps,
      momentum: ts.learningMomentum,
      avatarUrl: state.users.find((u) => u.id === ts.studentId)?.avatarUrl,
      currentDecision: evaluateNextAction({ studentId: ts.studentId }),
    }));
    res.json(formatted);
  });

  app.get('/api/teacher/knowledge-gaps', (req, res) => {
    const state = db.getState();
    const mine = db.getTeacherStudentIds(uid(req));
    const mySubs = db.getTeacherSubjectIds(uid(req));
    const rows = state.concepts
      .filter((c) => mySubs.has(c.subjectId))
      .map((c) => {
        const tcs = state.learningTwinConcepts.filter((t) => t.conceptId === c.id && t.attemptsCount > 0 && mine.has(t.studentId));
        if (tcs.length === 0) return null;
        const pct = (n: number) => Math.round((n / tcs.length) * 100);
        const low = pct(tcs.filter((t) => t.masteryScore < 50).length);
        const high = pct(tcs.filter((t) => t.masteryScore >= 75).length);
        return {
          topic: c.name,
          low,
          medium: 100 - low - high,
          high,
          alert: low >= 40 ? 'Prerequisite gap impacting downstream topics' : low >= 20 ? 'Moderate difficulty' : 'On track',
        };
      })
      .filter(Boolean);
    res.json(rows);
  });

  app.get('/api/teacher/analytics', (req, res) => {
    const state = db.getState();
    const cohort = getLiveCohortAnalytics(uid(req));
    const mineIds = db.getTeacherStudentIds(uid(req));
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekAgo = Date.now() - 7 * 86400000;
    const perDay: Set<string>[] = names.map(() => new Set<string>());
    const activeWeek = new Set<string>();
    const attempted = new Set<string>();
    for (const a of state.assessmentAttempts.filter((x) => mineIds.has(x.studentId))) {
      attempted.add(a.studentId);
      const t = new Date(a.completedAt || a.startedAt).getTime();
      if (t >= weekAgo) {
        perDay[new Date(t).getDay()].add(a.studentId);
        activeWeek.add(a.studentId);
      }
    }
    const total = cohort.totalStudents;
    res.json({
      engagement: total ? Math.round((activeWeek.size / total) * 100) : 0,
      assignmentCompletion: total ? Math.round((attempted.size / total) * 100) : 0,
      classAverage: cohort.avgMastery,
      weeklyActivity: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: names[d], active: perDay[d].size })),
    });
  });

  app.get('/api/teacher/interventions', (req, res) => {
    res.json(getLiveCohortAnalytics(uid(req)).interventions);
  });

  app.post('/api/teacher/interventions', (req, res) => {
    const { id, status } = req.body;
    const state = db.getState();
    let item = state.interventions.find((i) => i.id === id);
    if (!item) {
      item = getLiveCohortAnalytics(uid(req)).interventions.find((i) => i.id === id);
      if (item) state.interventions.push(item);
    }
    if (item) item.status = status;
    db.save();
    res.json({ success: true, intervention: item });
  });

  // =================== PROGRESS & ANALYTICS ===================
  app.get('/api/progress', (req, res) => {
    const studentId = uid(req);
    const twin = updateTwinMastery(studentId);
    const state = db.getState();

    const masteryTrend = state.assessmentAttempts
      .filter((a) => a.studentId === studentId && a.status === 'COMPLETED')
      .sort((a, b) => (a.completedAt || a.startedAt).localeCompare(b.completedAt || b.startedAt))
      .map((a, idx) => ({
        day: new Date(a.completedAt || a.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        mastery: a.score,
        attempt: idx + 1,
      }));

    const subjectProgress = db.getStudentSubjects(studentId).map((sub) => ({
      name: sub.name,
      mastery: twin.subjectMastery[sub.id] || 0,
      color: sub.color,
    }));

    res.json({
      overallMastery: twin.overallMastery,
      learningHours: twin.totalStudyHours,
      conceptsMastered: twin.conceptsMasteredCount,
      assessmentsCount: twin.assessmentsCompletedCount,
      avgScore: twin.avgAssessmentScore,
      masteryTrend,
      subjectProgress,
    });
  });

  // =================== GOALS & NOTIFICATIONS ===================
  app.get('/api/goals', (req, res) => {
    const studentId = uid(req);
    const goals = db.getGoals(studentId);
    res.json(goals);
  });

  app.post('/api/goals', (req, res) => {
    const { title, targetDate, milestones } = req.body;
    const studentId = uid(req);
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const state = db.getState();
    const newGoal = {
      id: `goal_${Date.now()}`,
      studentId,
      title: title || '',
      targetDate: targetDate || '',
      overallProgress: 0,
      milestones: milestones || [],
    };
    state.learningGoals.push(newGoal);
    db.save();
    res.json({ success: true, goal: newGoal });
  });

  app.get('/api/notifications', (req, res) => {
    const studentId = uid(req);
    const notifs = db.getNotifications(studentId);
    res.json(notifs);
  });

  app.post('/api/notifications/mark-read', (req, res) => {
    const { id } = req.body;
    const state = db.getState();
    const notif = state.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    db.save();
    res.json({ success: true });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`Unhandled error on ${req.method} ${req.path}:`, err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(200).json({
      error: 'internal_error',
      message: 'Something went wrong processing that request. Please try again.',
    });
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZONE Decision Engine Server running on port ${PORT}`);
  });
}

startServer();