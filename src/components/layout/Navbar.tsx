import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bell,
  Search,
  UserCheck,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react';
import { User } from '../../types.ts';

interface NavbarProps {
  user: User | null;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentScreen,
  onNavigate,
  onLogout,
  unreadCount = 0,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close any open dropdown on outside click or Escape — previously there was
  // no way to dismiss the Demo Scenario panel except re-clicking its own
  // trigger button, which wasn't obvious mid-demo.
  useEffect(() => {
    const closeAll = () => {
      setShowUserMenu(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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
              type="text"
              placeholder="Search concepts, topics, or ask tutor..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100/70 border border-slate-200 rounded-full text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-slate-100 text-slate-700">
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