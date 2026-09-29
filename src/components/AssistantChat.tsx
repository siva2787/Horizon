import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';

interface Msg {
    from: 'me' | 'bot';
    text: string;
}

const CHIPS: Record<string, string[]> = {
    STUDENT: ['How am I doing overall?', 'What are my weak concepts?', 'What should I study next?', 'Show my recent scores'],
    TEACHER: ['How many students do I have?', 'Which students are at risk?', 'Which topics have the most gaps?', 'Class average mastery'],
};

export const AssistantChat: React.FC<{ role: 'TEACHER' | 'STUDENT'; name?: string }> = ({ role, name }) => {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');
    const [msgs, setMsgs] = useState<Msg[]>([
        { from: 'bot', text: `Hi${name ? ` ${name.split(' ')[0]}` : ''}! Ask me anything about your ${role === 'TEACHER' ? 'classes and students' : 'learning data'}.` },
    ]);
    const end = useRef<HTMLDivElement>(null);
    useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, open]);

    const send = async (text: string) => {
        const message = text.trim();
        if (!message || busy) return;
        setInput('');
        setMsgs((m) => [...m, { from: 'me', text: message }]);
        setBusy(true);
        try {
            const res = await fetch('/api/assistant/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: msgs.slice(-6) }),
            });
            const d = await res.json().catch(() => ({}));
            setMsgs((m) => [...m, { from: 'bot', text: d.reply || d.error || 'Something went wrong.' }]);
        } catch {
            setMsgs((m) => [...m, { from: 'bot', text: 'Network error. Please try again.' }]);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-50">
            {open && (
                <div className="mb-3 w-[340px] max-w-[calc(100vw-2.5rem)] h-[480px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
                    <div className="px-4 py-3 bg-black text-white flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <Sparkles className="w-4 h-4" /> Zone Assistant
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
                        {msgs.map((m, i) => (
                            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.from === 'me' ? 'bg-black text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                                        }`}
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {busy && <div className="text-[11px] text-slate-400 px-1">Thinking…</div>}
                        <div ref={end} />
                    </div>
                    <div className="px-3 pt-2 flex gap-1.5 flex-wrap bg-white">
                        {CHIPS[role].map((c) => (
                            <button
                                key={c}
                                onClick={() => send(c)}
                                className="px-2.5 py-1 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    <div className="p-3 flex gap-2 bg-white">
                        <input
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="Ask about your data…"
                            value={input}
                            maxLength={500}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send(input)}
                        />
                        <button
                            onClick={() => send(input)}
                            disabled={busy || !input.trim()}
                            className="p-2.5 rounded-xl bg-black text-white disabled:opacity-50"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
            <button
                onClick={() => setOpen(!open)}
                className="w-14 h-14 rounded-full bg-black text-white shadow-xl flex items-center justify-center hover:bg-neutral-800 ml-auto"
                aria-label="Open assistant"
            >
                {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>
        </div>
    );
};