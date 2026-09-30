import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';

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
    useEffect(() => {
        end.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs, open]);

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
                    <div className="px-4 py-3 bg-neutral-950 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                                <Bot className="w-4 h-4" />
                            </span>
                            <div className="leading-tight">
                                <div className="text-sm font-bold">Zone AI Assistant</div>
                                <div className="text-[10px] text-neutral-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> Online</div>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
                        {msgs.map((m, i) => (
                            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.from === 'me' ? 'bg-neutral-950 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
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
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                            placeholder="Ask about your data…"
                            value={input}
                            maxLength={500}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send(input)}
                        />
                        <button
                            onClick={() => send(input)}
                            disabled={busy || !input.trim()}
                            className="p-2.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
            <div className="group ml-auto w-14">
                {!open && (
                    <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-neutral-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                        AI Assistant
                    </span>
                )}
                <button
                    onClick={() => setOpen(!open)}
                    className="relative w-14 h-14 rounded-full bg-gradient-to-br from-neutral-800 to-black text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] ring-4 ring-black/10 flex items-center justify-center hover:from-neutral-700 hover:to-neutral-900"
                    aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
                >
                    {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                    {!open && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-950 ring-2 ring-neutral-950">
                            <Sparkles className="h-3 w-3" />
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};