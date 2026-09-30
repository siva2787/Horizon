import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  GitFork,
  MessageSquare,
  Milestone,
  CheckSquare,
  Clock,
  TrendingUp,
  Target,
  Bell,
  Settings,
  Users,
  AlertOctagon,
  BarChart3,
  Lightbulb,
  LogOut,
  School,
  Cloud,
  Send,
  X,
} from 'lucide-react';
import { UserRole } from '../../types.ts';

interface SidebarProps {
  currentScreen: string;
  role: UserRole;
  onNavigate: (screen: string) => void;
  activeGapsCount?: number;
  unreadNotifications?: number;
  userName?: string;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  role,
  onNavigate,
  activeGapsCount = 0,
  unreadNotifications = 0,
  userName = '',
  onLogout,
  mobileOpen = false,
  onMobileClose,
}) => {
  type NavItem = { id: string; label: string; icon: any; highlight?: boolean; badge?: number | string };
  const studentItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'My Classes', icon: School, highlight: true },
    { id: 'learning-twin', label: 'My Learning Twin', icon: Sparkles, highlight: true },
    { id: 'knowledge-graph', label: 'Knowledge Graph', icon: GitFork },
    { id: 'knowledge-gaps', label: 'Knowledge Gaps', icon: AlertOctagon, badge: activeGapsCount > 0 ? activeGapsCount : undefined },
    { id: 'tutor', label: 'AI Tutor', icon: MessageSquare, badge: undefined },
    { id: 'learning-path', label: 'Learning Path', icon: Milestone },
    { id: 'assessments', label: 'Assessments', icon: CheckSquare },
    { id: 'retention', label: 'Retention & Revision', icon: Clock },
    { id: 'progress', label: 'Progress & Analytics', icon: TrendingUp },
    { id: 'goals', label: 'Learning Goals', icon: Target },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
    { id: 'settings', label: 'Profile & Settings', icon: Settings },
  ];

  const teacherItems: NavItem[] = [
    { id: 'teacher-dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Classrooms', icon: School, highlight: true },
    { id: 'class-twins', label: 'Class Learning Twins', icon: Users, highlight: true },
    { id: 'student-insights', label: 'Student Insights', icon: Lightbulb },
    { id: 'gap-analytics', label: 'Knowledge Gap Analytics', icon: GitFork },
    { id: 'interventions', label: 'Intervention Center', icon: AlertOctagon },
    { id: 'teacher-analytics', label: 'Teacher Analytics', icon: BarChart3 },
    { id: 'parent-reports', label: 'Parent Reports', icon: Send },
    { id: 'backup', label: 'Cloud Backup', icon: Cloud },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const items = role === 'TEACHER' ? teacherItems : studentItems;

  const handleNav = (id: string) => {
    onNavigate(id);
    onMobileClose?.();
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const inner = (
    <>
      <div className="space-y-4">
        {/* Main Portal Section */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {role === 'TEACHER' ? 'Teacher Portal' : 'Learner Portal'}
          </div>

          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${isActive
                      ? 'text-indigo-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${typeof item.badge === 'number'
                      ? 'bg-rose-100 text-rose-700'
                      : false
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-amber-100 text-amber-800'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Session & Logout Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
        <button
          onClick={() => handleNav('settings')}
          className="flex items-center gap-2.5 text-left group hover:opacity-85 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs ring-2 ring-indigo-500/10 group-hover:ring-indigo-500/30 transition-all">
            {(userName || (role === 'TEACHER' ? 'T' : 'S')).charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              {userName || (role === 'TEACHER' ? 'Teacher' : 'Student')}
            </div>
            <div className="text-[10px] text-slate-400">Settings & Security</div>
          </div>
        </button>

        {onLogout && (
          <button
            onClick={() => {
              onMobileClose?.();
              onLogout();
            }}
            title="Sign Out of Account"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex-col justify-between hidden md:flex">
        {inner}
      </aside>

      {/* Mobile drawer */}
      <div className={`md:hidden fixed inset-0 z-[60] ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          onClick={onMobileClose}
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl p-4 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M5 5H19L5 19H19" />
                </svg>
              </div>
              <span className="text-xl font-black text-black tracking-tight">Zone</span>
            </div>
            <button
              onClick={onMobileClose}
              aria-label="Close menu"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {inner}
        </aside>
      </div>
    </>
  );
};