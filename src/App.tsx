import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { LandingView } from './components/views/LandingView.tsx';
import { LoginView } from './components/views/LoginView.tsx';
import { RegisterView } from './components/views/RegisterView.tsx';
import { OnboardingView } from './components/views/OnboardingView.tsx';
import { DiagnosticAssessmentView } from './components/views/DiagnosticAssessmentView.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { LearningTwinView } from './components/views/LearningTwinView.tsx';
import { KnowledgeGraphView } from './components/views/KnowledgeGraphView.tsx';
import { KnowledgeGapExplorerView } from './components/views/KnowledgeGapExplorerView.tsx';
import { AITutorView } from './components/views/AITutorView.tsx';
import { AdaptiveLearningPathView } from './components/views/AdaptiveLearningPathView.tsx';
import { AdaptiveAssessmentView } from './components/views/AdaptiveAssessmentView.tsx';
import { RetentionRevisionView } from './components/views/RetentionRevisionView.tsx';
import { ProgressAnalyticsView } from './components/views/ProgressAnalyticsView.tsx';
import { LearningGoalsView } from './components/views/LearningGoalsView.tsx';
import { NotificationsView } from './components/views/NotificationsView.tsx';
import { TeacherDashboardView } from './components/views/TeacherDashboardView.tsx';
import { ClassLearningTwinsView } from './components/views/ClassLearningTwinsView.tsx';
import { StudentInsightsView } from './components/views/StudentInsightsView.tsx';
import { KnowledgeGapAnalyticsView } from './components/views/KnowledgeGapAnalyticsView.tsx';
import { InterventionCenterView } from './components/views/InterventionCenterView.tsx';
import { TeacherAnalyticsView } from './components/views/TeacherAnalyticsView.tsx';
import { ClassesView } from './components/views/ClassesView.tsx';
import { AssistantChat } from './components/AssistantChat.tsx';
import { ChatView } from './components/views/ChatView.tsx';
import { ProfileSettingsView } from './components/views/ProfileSettingsView.tsx';
import { User, StudentProfile, LearningTwin, KnowledgeGap, AdaptiveLearningPath, LearningTwinConcept, TeacherStudentItem } from './types.ts';

export default function App() {
  const SCREEN_STORAGE_KEY = 'learntwin_current_screen';
  const [currentScreen, setCurrentScreenRaw] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SCREEN_STORAGE_KEY) || 'landing';
    } catch {
      return 'landing';
    }
  });
  const setCurrentScreen = (screen: string) => {
    setCurrentScreenRaw(screen);
    try {
      sessionStorage.setItem(SCREEN_STORAGE_KEY, screen);
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  };
  const [authChecked, setAuthChecked] = useState(false);
  const [classCount, setClassCount] = useState(0);
  const [enrolledSubjects, setEnrolledSubjects] = useState<{ id: string; name: string; color: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [twin, setTwin] = useState<LearningTwin | null>(null);
  const [twinConcepts, setTwinConcepts] = useState<LearningTwinConcept[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [learningPath, setLearningPath] = useState<AdaptiveLearningPath | null>(null);
  const [selectedStudentForInsight, setSelectedStudentForInsight] = useState<TeacherStudentItem | null>(null);
  const [activeTutorConcept, setActiveTutorConcept] = useState<{
    id: string;
    name: string;
    mastery: number;
    gap: string;
    initialPrompt?: string;
  }>({ id: '', name: '', mastery: 0, gap: '' });

  const [activeAssessmentId, setActiveAssessmentId] = useState<string>('');

  const handleOpenAssessment = (idOrConceptId?: string) => {
    if (typeof idOrConceptId === 'string' && idOrConceptId.trim()) {
      setActiveAssessmentId(idOrConceptId);
    } else if (typeof idOrConceptId === 'object' && (idOrConceptId as any)?.conceptId) {
      setActiveAssessmentId((idOrConceptId as any).conceptId);
    }
    setCurrentScreen('assessments');
  };

  // Fetch current user and twin data on boot
  const clearSession = () => {
    setCurrentUser(null);
    setStudentProfile(null);
    setTwin(null);
    setTwinConcepts([]);
    setKnowledgeGaps([]);
    setLearningPath(null);
    setUnreadCount(0);
    setClassCount(0);
    setEnrolledSubjects([]);
  };

  const loadInitialData = async () => {
    try {
      const authRes = await fetch('/api/auth/current-user');
      const authData = await authRes.json();
      if (!authData.user) {
        clearSession();
        return;
      }
      setCurrentUser(authData.user);
      setStudentProfile(authData.profile);

      const clsRes = await fetch('/api/classes');
      const cls = clsRes.ok ? await clsRes.json() : [];
      setClassCount(Array.isArray(cls) ? cls.length : 0);
      setEnrolledSubjects(
        Array.isArray(cls) ? cls.flatMap((c: any) => c.subjects.map((s: any) => ({ id: s.id, name: s.name, color: s.color }))) : []
      );

      if (authData.user.role === 'STUDENT') {
        const [twinData, gapsData, pathData, conceptsData, notifs] = await Promise.all([
          fetch('/api/learning-twin').then((r) => r.json()),
          fetch('/api/knowledge-gaps').then((r) => r.json()),
          fetch('/api/learning-path').then((r) => r.json()),
          fetch('/api/learning-twin/concepts').then((r) => r.json()),
          fetch('/api/notifications').then((r) => r.json()),
        ]);
        setTwin(twinData.twin || null);
        setKnowledgeGaps(Array.isArray(gapsData) ? gapsData : []);
        setLearningPath(pathData && !pathData.error ? pathData : null);
        setTwinConcepts(Array.isArray(conceptsData) ? conceptsData : []);
        setUnreadCount(Array.isArray(notifs) ? notifs.filter((n: any) => !n.read).length : 0);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setChatUnread(0);
      return;
    }
    const poll = () =>
      fetch('/api/chat/unread')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setChatUnread(d.unread || 0))
        .catch(() => {});
    poll();
    const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, [currentUser?.id]);

  // Auth gate: only landing/login/register are reachable without a session
  useEffect(() => {
    if (authChecked && !currentUser && !['landing', 'login', 'register'].includes(currentScreen)) {
      setCurrentScreen('landing');
    }
  }, [authChecked, currentUser, currentScreen]);

  // User Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearSession();
    setCurrentScreen('landing');
  };

  const handleOpenTutorForConcept = (
    params?: string | { conceptId?: string; conceptName?: string; masteryScore?: number; detectedGap?: string; initialPrompt?: string },
    promptOverride?: string
  ) => {
    const opts = typeof params === 'object' && params !== null ? params : {};
    let id = typeof params === 'string' ? params : opts.conceptId || '';
    if (!id) {
      id =
        knowledgeGaps[0]?.conceptId ||
        [...twinConcepts].sort((a, b) => a.masteryScore - b.masteryScore)[0]?.conceptId ||
        '';
    }
    const conceptObj: any = twinConcepts.find((c) => c.conceptId === id || (c as any).id === id);
    const gapObj = knowledgeGaps.find((g) => g.conceptId === id);
    const name = opts.conceptName || conceptObj?.name || gapObj?.conceptName || id;
    const mastery = opts.masteryScore ?? conceptObj?.masteryScore ?? gapObj?.masteryScore ?? 0;
    const gap = opts.detectedGap || gapObj?.reason || '';
    const initialPrompt =
      opts.initialPrompt || promptOverride || `Explain ${name} step by step with clear analogies and practical examples.`;

    setActiveTutorConcept({ id, name, mastery, gap, initialPrompt });
    setCurrentScreen('tutor');
  };

  const navigate = (s: string) => {
    if (s === 'tutor' && !activeTutorConcept.id) {
      handleOpenTutorForConcept();
      return;
    }
    setCurrentScreen(s);
  };

  const isFullScreenPage = ['landing', 'login', 'register', 'onboarding', 'diagnostic'].includes(currentScreen);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar: only shown for authenticated/in-app screens */}
      {!isFullScreenPage && (
        <Navbar
          user={currentUser}
          currentScreen={currentScreen}
          onNavigate={navigate}
          onLogout={handleLogout}
          unreadCount={unreadCount}
        />
      )}

      {/* Main Body Layout */}
      {isFullScreenPage ? (
        <main className="flex-1">
          {currentScreen === 'landing' && (
            <LandingView
              onGetStarted={() => setCurrentScreen('register')}
              onLogin={() => setCurrentScreen('login')}
              onRegister={() => setCurrentScreen('register')}
            />
          )}

          {currentScreen === 'login' && (
            <LoginView
              onLoginSuccess={async (email, password) => {
                const res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, password }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Login failed');
                await loadInitialData();
                const mine = await fetch('/api/classes').then((r) => r.json());
                setCurrentScreen(data.user.role === 'TEACHER' ? 'teacher-dashboard' : Array.isArray(mine) && mine.length ? 'dashboard' : 'classes');
              }}
              onNavigateRegister={() => setCurrentScreen('register')}
              onBackToLanding={() => setCurrentScreen('landing')}
            />
          )}

          {currentScreen === 'register' && (
            <RegisterView
              onRegisterSuccess={async (data) => {
                const res = await fetch('/api/auth/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Registration failed');
                await loadInitialData();
                setCurrentScreen(result.user.role === 'TEACHER' ? 'teacher-dashboard' : 'onboarding');
              }}
              onNavigateLogin={() => setCurrentScreen('login')}
              onBackToLanding={() => setCurrentScreen('landing')}
            />
          )}

          {currentScreen === 'onboarding' && (
            <OnboardingView
              onCompleteOnboarding={async (data) => {
                await fetch('/api/auth/onboarding', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                await loadInitialData();
              }}
              onTakeDiagnostic={() => setCurrentScreen('classes')}
              onBackToLanding={() => setCurrentScreen('landing')}
              onSkipToDashboard={() => setCurrentScreen('classes')}
            />
          )}

          {currentScreen === 'diagnostic' && (
            <DiagnosticAssessmentView
              onCompleteDiagnostic={async (score) => {
                await loadInitialData();
                setCurrentScreen('dashboard');
              }}
              onExit={() => setCurrentScreen('classes')}
            />
          )}
        </main>
      ) : (
        /* Authenticated App Shell with Sidebar */
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          <Sidebar
            currentScreen={currentScreen}
            role={currentUser?.role || 'STUDENT'}
            onNavigate={navigate}
            userName={currentUser?.name}
            activeGapsCount={knowledgeGaps.length}
            unreadNotifications={unreadCount}
            onLogout={handleLogout}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {/* Student Screens */}
            {currentScreen === 'dashboard' && (
              <DashboardView
                twin={twin}
                subjects={enrolledSubjects}
                studentName={currentUser?.name}
                gaps={knowledgeGaps}
                onStartRecommendedLearning={() => handleOpenTutorForConcept()}
                streakDays={studentProfile?.learningStreakDays}
                onNavigateTwin={() => setCurrentScreen('learning-twin')}
                onNavigateGraph={() => setCurrentScreen('knowledge-graph')}
                onNavigateTutor={(cId) => handleOpenTutorForConcept(cId)}
                onNavigatePath={() => setCurrentScreen('learning-path')}
                onNavigateAssessments={(cId) => handleOpenAssessment(cId)}
                onNavigateRetention={() => setCurrentScreen('retention')}
              />
            )}

            {currentScreen === 'classes' && currentUser && (
              <ClassesView role={currentUser.role === 'TEACHER' ? 'TEACHER' : 'STUDENT'} onChanged={loadInitialData} onStartDiagnostic={() => setCurrentScreen('diagnostic')} />
            )}

            {currentScreen === 'learning-twin' && (
              <LearningTwinView
                twin={twin}
                profile={studentProfile}
                subjects={enrolledSubjects}
                twinConcepts={twinConcepts}
                user={currentUser}
                onNavigateTutor={(cId) => handleOpenTutorForConcept(cId)}
                onNavigateGraph={() => setCurrentScreen('knowledge-graph')}
                onNavigateRetention={() => setCurrentScreen('retention')}
              />
            )}

            {currentScreen === 'knowledge-graph' && (
              <KnowledgeGraphView
                onSelectConcept={(cId) => handleOpenTutorForConcept(cId)}
                onNavigateTutor={(cId) => handleOpenTutorForConcept(cId)}
                onNavigateAssessment={(cId) => handleOpenAssessment(cId)}
              />
            )}

            {currentScreen === 'knowledge-gaps' && (
              <KnowledgeGapExplorerView
                gaps={knowledgeGaps}
                onFixGap={(cId) => handleOpenTutorForConcept(cId)}
                onNavigateGraph={() => setCurrentScreen('knowledge-graph')}
              />
            )}

            {currentScreen === 'tutor' && (
              <AITutorView
                key={`${activeTutorConcept.id}_${activeTutorConcept.initialPrompt || ''}`}
                conceptId={activeTutorConcept.id}
                conceptName={activeTutorConcept.name}
                masteryScore={activeTutorConcept.mastery}
                detectedGap={activeTutorConcept.gap}
                studentName={currentUser?.name || ''}
                initialPrompt={activeTutorConcept.initialPrompt}
              />
            )}

            {currentScreen === 'learning-path' && (
              <AdaptiveLearningPathView
                path={learningPath}
                onSelectConcept={(cId) => handleOpenTutorForConcept(cId)}
                onStartLesson={(cId) => handleOpenTutorForConcept(cId)}
              />
            )}

            {currentScreen === 'assessments' && (
              <AdaptiveAssessmentView
                key={activeAssessmentId}
                assessmentId={activeAssessmentId}
                onComplete={async () => {
                  await loadInitialData();
                  setCurrentScreen('dashboard');
                }}
                onNavigateTutor={(cId) => handleOpenTutorForConcept(cId)}
              />
            )}

            {currentScreen === 'retention' && (
              <RetentionRevisionView
                onPracticeConcept={(cId) => handleOpenTutorForConcept(cId)}
              />
            )}

            {currentScreen === 'progress' && <ProgressAnalyticsView />}

            {currentScreen === 'goals' && <LearningGoalsView />}

            {currentScreen === 'notifications' && <NotificationsView />}

            {/* Teacher Screens */}
            {currentScreen === 'teacher-dashboard' && (
              <TeacherDashboardView
                onNavigateClassTwins={() => setCurrentScreen('class-twins')}
                onNavigateGapAnalytics={() => setCurrentScreen('gap-analytics')}
                onNavigateInterventions={() => setCurrentScreen('interventions')}
              />
            )}

            {currentScreen === 'class-twins' && (
              <ClassLearningTwinsView
                onSelectStudent={(s) => {
                  setSelectedStudentForInsight(s);
                  setCurrentScreen('student-insights');
                }}
              />
            )}

            {currentScreen === 'student-insights' && (
              <StudentInsightsView
                student={selectedStudentForInsight}
                onBack={() => setCurrentScreen('class-twins')}
                onAssignIntervention={(name) => setCurrentScreen('interventions')}
              />
            )}

            {currentScreen === 'gap-analytics' && <KnowledgeGapAnalyticsView />}

            {currentScreen === 'interventions' && <InterventionCenterView />}

            {currentScreen === 'teacher-analytics' && <TeacherAnalyticsView />}

            {currentScreen === 'messages' && currentUser && (
              <ChatView meId={currentUser.id} onUnreadChange={setChatUnread} />
            )}

            {currentScreen === 'settings' && (
              <ProfileSettingsView
                user={currentUser}
                profile={studentProfile}
                onUpdateName={async (name) => {
                  await fetch('/api/auth/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                  });
                  await loadInitialData();
                }}
                onLogout={handleLogout}
                onUpdateAvatar={async (avatarUrl) => {
                  const res = await fetch('/api/auth/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatarUrl }),
                  });
                  if (!res.ok) throw new Error('Failed to save avatar');
                  await loadInitialData();
                }}
                onDeleteProfile={async () => {
                  await fetch('/api/auth/profile', { method: 'DELETE' });
                  await loadInitialData();
                  handleLogout();
                }}
              />
            )}
          </main>
        </div>
      )}
      {currentUser && !isFullScreenPage && currentScreen !== 'messages' && (
        <button
          onClick={() => setCurrentScreen('messages')}
          className="fixed bottom-6 right-24 z-40 h-12 px-4 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-semibold"
        >
          {currentUser.role === 'TEACHER' ? 'Students' : 'Teachers'} Chat
          {chatUnread > 0 && (
            <span className="bg-white text-indigo-700 text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
              {chatUnread}
            </span>
          )}
        </button>
      )}
      {currentUser && !isFullScreenPage && (
        <AssistantChat role={currentUser.role === 'TEACHER' ? 'TEACHER' : 'STUDENT'} name={currentUser.name} />
      )}
    </div>
  );
}