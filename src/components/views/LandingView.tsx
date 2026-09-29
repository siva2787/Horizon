import React, { useMemo } from 'react';
import {
  Brain,
  Sparkles,
  ArrowRight,
  GitFork,
  MessageSquare,
  Clock,
  CheckCircle2,
  TrendingUp,
  Zap,
  Target,
  Users,
  Layers,
  Award,
  ChevronRight,
  GraduationCap,
  Activity,
  School,
  FileCheck,
} from 'lucide-react';

const ZoneLogoAnimated: React.FC = () => {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; d: number }[] = [];
    const R = 50;
    const step = 8.2;
    for (let row = -6; row <= 6; row++) {
      for (let col = -6; col <= 6; col++) {
        const x = col * step + (row % 2 ? step / 2 : 0);
        const y = row * step * 0.9;
        const dist = Math.sqrt(x * x + y * y);
        if (dist > R - 2) continue;
        const r = 0.9 + 3.1 * Math.sqrt(Math.max(0, 1 - (dist / R) ** 2));
        out.push({ x, y, r, d: dist / R });
      }
    }
    return out;
  }, []);

  return (
    <div className="zl-stage">
      <style>{`
        .zl-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .zl-orb{position:absolute;border-radius:9999px;filter:blur(28px);opacity:.55;animation:zlDrift 9s ease-in-out infinite}
        .zl-shine{position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:translateX(-160%) skewX(-18deg);animation:zlShine 5.5s ease-in-out 1.6s infinite}
        .zl-logo{width:86%;height:auto;animation:zlFloat 6s ease-in-out infinite;filter:drop-shadow(0 12px 18px rgba(75,64,61,.18))}
        .zl-l{fill:#4b403d;opacity:0}
        .zl-z{animation:zlInL .9s cubic-bezier(.2,.8,.2,1) .15s forwards}
        .zl-n{animation:zlInR .9s cubic-bezier(.2,.8,.2,1) .3s forwards}
        .zl-e{animation:zlInR .9s cubic-bezier(.2,.8,.2,1) .45s forwards}
        .zl-sphere{transform-box:fill-box;transform-origin:center;opacity:0;animation:zlPop 1s cubic-bezier(.2,.9,.3,1.2) .55s forwards}
        .zl-halo{transform-box:fill-box;transform-origin:center;animation:zlHalo 3.2s ease-out 1.4s infinite;opacity:0}
        .zl-dot{fill:#4b403d;transform-box:fill-box;transform-origin:center;animation:zlDot 3.2s ease-in-out infinite}
        .zl-tag{opacity:0;animation:zlFade 1s ease 1.3s forwards}
        @keyframes zlInL{from{opacity:0;transform:translateX(-26px)}to{opacity:1;transform:none}}
        @keyframes zlInR{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}
        @keyframes zlPop{from{opacity:0;transform:scale(.2) rotate(-90deg)}to{opacity:1;transform:none}}
        @keyframes zlDot{0%,100%{transform:scale(1);fill:#4b403d}45%{transform:scale(1.5);fill:#6366f1}70%{transform:scale(.85)}}
        @keyframes zlHalo{0%{opacity:.5;transform:scale(.9)}100%{opacity:0;transform:scale(1.6)}}
        @keyframes zlFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes zlDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-14px) scale(1.15)}}
        @keyframes zlShine{0%{transform:translateX(-160%) skewX(-18deg)}55%,100%{transform:translateX(420%) skewX(-18deg)}}
        @keyframes zlFade{to{opacity:1}}
        @media (prefers-reduced-motion:reduce){.zl-stage *{animation:none!important;opacity:1!important;transform:none!important}}
      `}</style>

      <div className="zl-orb" style={{ width: 150, height: 150, background: '#c7d2fe', top: -30, left: -20 }} />
      <div className="zl-orb" style={{ width: 130, height: 130, background: '#e9d5ff', bottom: -30, right: -10, animationDelay: '-4s' }} />

      <svg className="zl-logo" viewBox="-6 -2 400 124" role="img" aria-label="Zone">
        <path className="zl-l zl-z" d="M0 10H82V32L36 88H84V110H0V88L46 32H0Z" />
        <g className="zl-sphere">
          <circle className="zl-halo" cx="144" cy="60" r="50" fill="none" stroke="#6366f1" strokeWidth="1.5" />
          <g transform="translate(144 60)">
            {dots.map((d, i) => (
              <circle
                key={i}
                className="zl-dot"
                cx={d.x}
                cy={d.y}
                r={d.r}
                style={{ animationDelay: `${(1.4 + d.d * 1.6).toFixed(2)}s` }}
              />
            ))}
          </g>
        </g>
        <path className="zl-l zl-n" d="M206 110V10H232L262 66V10H286V110H260L230 54V110Z" />
        <path className="zl-l zl-e" d="M302 10H388V32H326V50H382V70H326V88H388V110H302Z" />
      </svg>

      <div className="zl-shine" />
    </div>
  );
};

interface LandingViewProps {
  onGetStarted: () => void;
  onExploreDashboard?: () => void;
  onLogin: () => void;
  onRegister?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGetStarted,
  onLogin,
  onRegister,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Floating Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={onLogin}
            id="landing-nav-brand"
          >
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-md hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M5 5H19L5 19H19" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-black text-black tracking-tight">Zone</span>
              <p className="text-[10px] font-medium text-slate-500 tracking-tight -mt-1 hidden sm:block">
                Your Learning Twin. A Smarter You.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Twin Capabilities
            </a>
            <a href="#architecture" className="hover:text-indigo-600 transition-colors">
              AI Architecture
            </a>
            <a href="#educators" className="hover:text-indigo-600 transition-colors">
              For Educators
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onGetStarted}
              id="landing-btn-start"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Ambient Warm/Cool Tint Orbs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-40 right-10 w-[350px] h-[350px] bg-purple-100/50 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Mission, Value Prop, Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Yuva Megathon 2026 • AI-Powered Personalized Learning Twin</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Meet Your <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent">
                Digital Learning Twin
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
              Not another generic chatbot. LearnTwin builds an active, mathematical model of your brain:
              tracking knowledge mastery, diagnosing prerequisite bottlenecks, and predicting memory fading with spaced retention.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={onGetStarted}
                id="hero-btn-onboarding"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <span>Start Student Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onLogin}
                id="hero-btn-dashboard"
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Sign In to Dashboard</span>
              </button>
            </div>
          </div>

          {/* Right Column: Holographic Learning Twin Visual Card in Pristine Light Mode */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative">
              {/* Top Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Twin State: Synchronized
                  </span>
                </div>
              </div>

              {/* Avatar Centerpiece with Holographic Badges */}
              <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-gradient-to-tr from-slate-100 via-indigo-50 to-purple-50 flex items-center justify-center mt-4 p-4 border border-slate-200">
                <ZoneLogoAnimated />
              </div>

              <p className="mt-5 text-xs text-slate-600 leading-relaxed">
                Your twin is built from your own assessment results — mastery, gaps and retention appear here once you take your first diagnostic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 5-Step Closed-Loop Cognitive Flow */}
      <section id="how-it-works" className="py-20 bg-white border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Deterministic Learning Loop</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              How LearnTwin AI Operates
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              A closed-loop system connecting diagnostic assessment, mathematical modeling, gap detection, and adaptive revision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Diagnostic Test',
                desc: 'Adaptive multi-tiered questions assess baseline conceptual depth and latency.',
                icon: CheckCircle2,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                border: 'border-indigo-100',
              },
              {
                step: '02',
                title: 'Knowledge Graph',
                desc: 'Prerequisite dependencies are mapped dynamically across topics and sub-skills.',
                icon: GitFork,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-100',
              },
              {
                step: '03',
                title: 'Gap Backtracking',
                desc: 'Root bottleneck detection pinpoints exactly why downstream topics fail.',
                icon: Target,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100',
              },
              {
                step: '04',
                title: 'Local AI Tutor',
                desc: 'Socratic dialogue scaffolds explanations based strictly on the student twin state.',
                icon: MessageSquare,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
              },
              {
                step: '05',
                title: 'Spaced Repetition',
                desc: 'Ebbinghaus forgetting curve scheduling preserves memory health before it fades.',
                icon: Clock,
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                border: 'border-rose-100',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-white hover:shadow-md transition-all space-y-3 relative group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="text-xs font-mono font-black text-slate-400">{item.step}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div
                    onClick={onLogin}
                    className="pt-3 border-t border-slate-200/80 flex items-center gap-1 text-[11px] font-bold text-slate-500 group-hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span>Explore module</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="features" className="py-20 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
              <Award className="w-3.5 h-3.5" />
              <span>Core Pillars</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Crafted for Real Academic Growth
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Every feature serves a measurable cognitive purpose.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Personalized Digital Twin</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                A mathematical twin representation mirroring each learner’s strengths, gaps, cognitive momentum, and decay timelines.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Per-concept mastery percentage tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Cognitive learning momentum calculation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Real-time sync with teacher intervention alerts</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Socratic Local AI Tutor</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Context-injected tutor that knows what prerequisite you are struggling with before you even type your question.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>Step-by-step Socratic guided questioning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>Adaptive analogies tailored to your learning style</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>Interactive quizzes that verify understanding</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Ebbinghaus Retention Engine</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Smart revision scheduler that triggers 2-minute memory booster workouts right as concept retention drops below 60%.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600" />
                  <span>Predicted retention scores for all concepts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600" />
                  <span>Urgent revision alerts with 1-click practice</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600" />
                  <span>Continuous memory stability reinforcement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For Educators Section */}
      <section id="educators" className="py-20 bg-white border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
              <School className="w-3.5 h-3.5" />
              <span>Teacher Telemetry Portal</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Classroom Insights Without the Guesswork
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Educators get a birds-eye view of every student's cognitive twin: live mastery heatmaps, high-risk dropoff alerts, and 1-click tailored remedial assignments.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-xl font-bold text-slate-900">Live Heatmaps</div>
                <div className="text-xs text-slate-500 mt-1">Class-wide concept bottlenecks mapped instantly</div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-xl font-bold text-purple-600">Smart Alerts</div>
                <div className="text-xs text-slate-500 mt-1">Intervene before exam failure occurs</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="text-xs font-bold text-slate-900">Teacher Portal Highlights</div>

            </div>
            <div className="space-y-3">
              {[
                { title: 'Cohort mastery', desc: 'Average mastery across all registered students' },
                { title: 'At-risk detection', desc: 'Students flagged from their own knowledge gaps' },
                { title: 'Intervention queue', desc: 'Remediation groups generated from real gap data' },
              ].map((row, i) => (
                <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900">{row.title}</div>
                  <div className="text-[11px] text-slate-500">{row.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner in Clean High-Contrast Light / Indigo */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white px-4 sm:px-6 lg:px-8 text-center shadow-inner">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to Build Your Learning Twin?
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Experience the working prototype built for the Yuva Megathon. Step through the student onboarding or sign in to access your dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onGetStarted}
              id="cta-btn-onboard"
              className="px-6 py-3.5 rounded-xl bg-white text-indigo-900 font-black text-xs sm:text-sm hover:bg-slate-100 shadow-xl transition-all hover:scale-[1.02]"
            >
              Start Student Onboarding
            </button>
            <button
              onClick={onLogin}
              id="cta-btn-login"
              className="px-6 py-3.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-800 border border-indigo-400/40 text-white font-bold text-xs sm:text-sm transition-all"
            >
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-100 border-t border-slate-200 text-slate-500 text-xs text-center px-4">
        <p>© 2026 LearnTwin AI • Yuva Megathon Prototype • Empowering Every Learner with an AI Digital Twin</p>
      </footer>
    </div>
  );
};