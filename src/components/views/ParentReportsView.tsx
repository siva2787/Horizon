import React, { useEffect, useState } from 'react';
import { Send, Loader2, Check } from 'lucide-react';

interface Row {
    studentId: string;
    name: string;
    parentPhone: string;
    classes: string[];
    mastery: number;
    mastered: number;
    assessments: number;
    avgScore: number;
    gapCount: number;
    gaps: string[];
}

const buildMessage = (r: Row) =>
    [
        `Progress Report - ${r.name}`,
        r.classes.length ? `Class: ${r.classes.join(', ')}` : '',
        `Overall mastery: ${r.mastery}%`,
        `Concepts mastered: ${r.mastered}`,
        `Assessments completed: ${r.assessments} (avg score ${r.avgScore}%)`,
        r.gapCount ? `Needs attention (${r.gapCount}): ${r.gaps.join(', ')}` : 'No knowledge gaps at present.',
        '',
        '- Zone Learning Platform',
    ]
        .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
        .join('\n');

export const ParentReportsView: React.FC = () => {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [phones, setPhones] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});
    const [err, setErr] = useState('');

    useEffect(() => {
        fetch('/api/teacher/parent-reports')
            .then((r) => r.json())
            .then((d: Row[]) => {
                setRows(d);
                setPhones(Object.fromEntries(d.map((x) => [x.studentId, x.parentPhone])));
            })
            .catch(() => setErr('Failed to load students'));
    }, []);

    const save = async (id: string): Promise<string | null> => {
        setErr('');
        try {
            const r = await fetch('/api/teacher/parent-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: id, phone: phones[id] || '' }),
            });
            const d = await r.json();
            if (!r.ok) {
                setErr(d.message || 'Failed to save number');
                return null;
            }
            setPhones((p) => ({ ...p, [id]: d.parentPhone }));
            setSaved((s) => ({ ...s, [id]: true }));
            setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 1500);
            return d.parentPhone as string;
        } catch {
            setErr('Failed to save number');
            return null;
        }
    };

    const send = async (r: Row) => {
        const phone = await save(r.studentId);
        if (!phone) {
            if (!phones[r.studentId]) setErr('Enter the parent mobile number first');
            return;
        }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(r))}`, '_blank', 'noopener');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-1">
                    <Send className="w-3.5 h-3.5" />
                    <span>Parent Communication</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Parent Reports</h1>
                <p className="text-xs text-slate-500">Send each student's progress report to their parent on WhatsApp.</p>
            </div>

            {err && <div className="text-xs font-semibold text-rose-600">{err}</div>}

            {!rows ? (
                <div className="py-10 flex justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : rows.length === 0 ? (
                <div className="text-xs text-slate-500">No students in your classes yet.</div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 max-w-4xl">
                    {rows.map((r) => (
                        <div key={r.studentId} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 text-sm truncate">{r.name}</div>
                                <div className="text-xs text-slate-500">
                                    Mastery {r.mastery}% · {r.gapCount} gap{r.gapCount === 1 ? '' : 's'} · Avg {r.avgScore}%
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="tel"
                                    inputMode="tel"
                                    value={phones[r.studentId] || ''}
                                    onChange={(e) => setPhones((p) => ({ ...p, [r.studentId]: e.target.value }))}
                                    onBlur={() => save(r.studentId)}
                                    placeholder="Parent mobile (+91…)"
                                    className="w-44 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {saved[r.studentId] && <Check className="w-4 h-4 text-emerald-600" />}
                                <button
                                    onClick={() => send(r)}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-2"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};