import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bell,
  Search,
  UserCheck,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
  CornerDownLeft,
} from 'lucide-react';
import { User } from '../../types.ts';

interface NavbarProps {
  user: User | null;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
  unreadCount?: number;
  onMenuClick?: () => void;
}

type SearchItem = { id: string; label: string; keys: string };
const STUDENT_PAGES: SearchItem[] = [
  { id: 'dashboard', label: 'Dashboard', keys: 'home overview' },
  { id: 'classes', label: 'My Classes', keys: 'classroom join room code subjects files' },
  { id: 'learning-twin', label: 'My Learning Twin', keys: 'twin profile mastery' },
  { id: 'knowledge-graph', label: 'Knowledge Graph', keys: 'concepts topics map' },
  { id: 'knowledge-gaps', label: 'Knowledge Gaps', keys: 'weak gaps missing' },
  { id: 'tutor', label: 'AI Tutor', keys: 'ask chat help doubt' },
  { id: 'learning-path', label: 'Learning Path', keys: 'roadmap plan' },
  { id: 'assessments', label: 'Assessments', keys: 'quiz test exam' },
  { id: 'retention', label: 'Retention & Revision', keys: 'revise memory review' },
  { id: 'progress', label: 'Progress & Analytics', keys: 'stats performance charts' },
  { id: 'goals', label: 'Learning Goals', keys: 'targets' },
  { id: 'notifications', label: 'Notifications', keys: 'alerts bell' },
  { id: 'settings', label: 'Profile & Settings', keys: 'account avatar photo' },
];
const TEACHER_PAGES: SearchItem[] = [
  { id: 'teacher-dashboard', label: 'Teacher Dashboard', keys: 'home overview' },
  { id: 'classes', label: 'Classrooms', keys: 'class room code subjects files' },
  { id: 'class-twins', label: 'Class Learning Twins', keys: 'twin students' },
  { id: 'student-insights', label: 'Student Insights', keys: 'students' },
  { id: 'gap-analytics', label: 'Knowledge Gap Analytics', keys: 'weak gaps' },
  { id: 'interventions', label: 'Intervention Center', keys: 'help support' },
  { id: 'teacher-analytics', label: 'Teacher Analytics', keys: 'stats charts' },
  { id: 'parent-reports', label: 'Parent Reports', keys: 'send report' },
  { id: 'backup', label: 'Cloud Backup', keys: 'save export' },
  { id: 'settings', label: 'Settings', keys: 'account profile' },
];

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentScreen,
  onNavigate,
  onLogout,
  unreadCount = 0,
  onMenuClick,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const pages = user?.role === 'TEACHER' ? TEACHER_PAGES : STUDENT_PAGES;
  const results = q
    ? pages.filter((p) => `${p.label} ${p.keys}`.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const canAsk = user?.role !== 'TEACHER' && q.length > 0;
  const total = results.length + (canAsk ? 1 : 0);

  const go = (i: number) => {
    if (i < results.length) onNavigate(results[i].id);
    else if (canAsk) onNavigate('tutor');
    else return;
    setQuery('');
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close any open dropdown on outside click or Escape — previously there was
  // no way to dismiss the Demo Scenario panel except re-clicking its own
  // trigger button, which wasn't obvious mid-demo.
  useEffect(() => {
    const closeAll = () => {
      setShowUserMenu(false);
      setSearchOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header ref={navRef} className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Main Nav Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
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

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (total) setActive((a) => (a + 1) % total);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (total) setActive((a) => (a - 1 + total) % total);
                } else if (e.key === 'Enter') {
                  go(active);
                } else if (e.key === 'Escape') {
                  setSearchOpen(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search pages, concepts, or ask tutor..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100/70 border border-slate-200 rounded-full text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchOpen && q && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50">
                {results.map((r, i) => (
                  <button
                    key={r.id + r.label}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(i)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${active === i ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                  >
                    <span>{r.label}</span>
                    {active === i && <CornerDownLeft className="w-3.5 h-3.5" />}
                  </button>
                ))}
                {canAsk && (
                  <button
                    onMouseEnter={() => setActive(results.length)}
                    onClick={() => go(results.length)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${active === results.length ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate">Ask AI Tutor: {query.trim()}</span>
                  </button>
                )}
                {!total && <div className="px-3 py-2 text-xs text-slate-400">No results</div>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-slate-100 text-slate-700">
            {user?.role === 'TEACHER' ? 'Teacher' : 'Student'}
          </span>

          {/* Notifications Button */}
          <button
            onClick={() => onNavigate('notifications')}
            className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* User Avatar & Menu */}
          <div className="relative">
            <div
              onClick={() => {
                setShowUserMenu(!showUserMenu);
              }}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group select-none"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-black/10 group-hover:ring-black shadow-sm transition-all">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-700 to-black text-white text-sm font-bold flex items-center justify-center">
                    {(user?.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                  {user?.name || ''}
                  {user?.role === 'TEACHER' && (
                    <UserCheck className="w-3 h-3 text-purple-600 inline" />
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  {user?.role === 'TEACHER' ? 'Faculty' : 'Student'}
                </div>
              </div>
            </div>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="text-xs font-bold text-slate-800">{user?.name || ''}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.email || ''}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {user?.role === 'TEACHER' ? 'Instructor Portal' : 'Student Learner'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-500" />
                  <span>Profile & Settings</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate(user?.role === 'TEACHER' ? 'class-twins' : 'learning-twin');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{user?.role === 'TEACHER' ? 'Class Learning Twins' : 'My Learning Twin'}</span>
                </button>

                {onLogout && (
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};