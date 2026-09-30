import React, { useState } from 'react';
import { GraduationCap, Users, Check, ArrowRight, Loader2 } from 'lucide-react';

export type Role = 'STUDENT' | 'TEACHER';

interface RoleSelectViewProps {
    name?: string;
    onConfirm: (role: Role) => Promise<void> | void;
    onLogout?: () => void;
}

const OPTIONS: {
    role: Role;
    title: string;
    desc: string;
    icon: React.ElementType;
    features: string[];
}[] = [
        {
            role: 'STUDENT',
            title: 'Student',
            desc: 'Learn with an adaptive path that adjusts to you.',
            icon: GraduationCap,
            features: ['Personalized learning path', 'Practice and assessments', 'Track knowledge gaps', 'AI learning tutor'],
        },
        {
            role: 'TEACHER',
            title: 'Teacher',
            desc: 'Understand learning gaps and guide your students.',
            icon: Users,
            features: ['Create and manage classrooms', 'View student progress', 'Identify learning gaps', 'Intervene and guide'],
        },
    ];

export const RoleSelectView: React.FC<RoleSelectViewProps> = ({ name, onConfirm, onLogout }) => {
    const [selected, setSelected] = useState<Role>('STUDENT');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await onConfirm(selected);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 flex items-center justify-center px-4 py-10">
            <div className="pointer-events-none absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-200/40 blur-3xl" />

            <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-xl rounded-[2rem] border border-slate-200/80 shadow-2xl shadow-indigo-900/10 p-6 sm:p-10">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-md">
                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="square" strokeLinejoin="miter">
                                <path d="M5 5H19L5 19H19" />
                            </svg>
                        </div>
                        <span className="text-2xl font-black tracking-tight text-black">ZONE</span>
                    </div>

                    <span className="mt-6 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                        Your Learning Twin
                    </span>
                    <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Choose your role</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {name ? `Welcome, ${name.split(' ')[0]}. ` : ''}This helps us personalize your experience.
                    </p>
                </div>

                <div role="radiogroup" aria-label="Choose your role" className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {OPTIONS.map((o) => {
                        const active = selected === o.role;
                        const Icon = o.icon;
                        return (
                            <button
                                key={o.role}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setSelected(o.role)}
                                className={`relative text-left rounded-2xl border-2 p-5 sm:p-6 transition-all duration-200 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${active
                                        ? 'border-indigo-600 bg-gradient-to-br from-indigo-50/80 to-white shadow-lg shadow-indigo-500/10'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                    }`}
                            >
                                <span
                                    className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                                        }`}
                                >
                                    {active && <span className="w-2 h-2 rounded-full bg-white" />}
                                </span>

                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <div className="pr-8">
                                        <div className="text-lg font-extrabold text-slate-900">{o.title}</div>
                                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{o.desc}</p>
                                    </div>
                                </div>

                                <ul className="mt-5 space-y-2.5">
                                    {o.features.map((f) => (
                                        <li key={f} className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                                            <Check className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} strokeWidth={3} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="w-full sm:w-72 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        <span>Continue</span>
                        {!busy && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
                <p className="mt-4 text-center text-[11px] text-slate-400">Your role is set once for this account.</p>
                {onLogout && (
                    <button
                        type="button"
                        onClick={onLogout}
                        className="mx-auto mt-2 block text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                    >
                        Not you? Sign out
                    </button>
                )}
            </div>
        </div>
    );
};