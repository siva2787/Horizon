import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';

interface Contact {
    id: string;
    name: string;
    role: 'STUDENT' | 'TEACHER';
    avatarUrl?: string;
    classNames: string[];
    lastMessage: string;
    lastAt: string;
    unread: number;
}
interface Msg {
    id: string;
    fromId: string;
    toId: string;
    content: string;
    timestamp: string;
    readAt?: string;
}

const fmt = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Avatar = ({ c }: { c: Contact }) =>
    c.avatarUrl ? (
        <img src={c.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
    ) : (
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
            {c.name.charAt(0).toUpperCase()}
        </div>
    );

export function ChatView({ meId, onUnreadChange }: { meId: string; onUnreadChange?: (n: number) => void }) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeId, setActiveId] = useState('');
    const [messages, setMessages] = useState<Msg[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const active = contacts.find((c) => c.id === activeId);

    const loadContacts = async () => {
        try {
            const r = await fetch('/api/chat/contacts');
            if (!r.ok) return;
            const data: Contact[] = await r.json();
            setContacts(data);
            onUnreadChange?.(data.reduce((n, c) => n + c.unread, 0));
        } catch {
            // retry on next poll
        } finally {
            setLoaded(true);
        }
    };

    const loadThread = async (id: string) => {
        try {
            const r = await fetch(`/api/chat/${id}`);
            if (r.ok) setMessages(await r.json());
        } catch {
            // retry on next poll
        }
    };

    useEffect(() => {
        loadContacts();
        const t = setInterval(loadContacts, 5000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        setMessages([]);
        if (!activeId) return;
        loadThread(activeId).then(loadContacts);
        const t = setInterval(() => loadThread(activeId), 3000);
        return () => clearInterval(t);
    }, [activeId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, activeId]);

    const send = async () => {
        const content = text.trim();
        if (!content || !activeId || sending) return;
        setSending(true);
        try {
            const r = await fetch(`/api/chat/${activeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (r.ok) {
                setText('');
                await loadThread(activeId);
                loadContacts();
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex h-[calc(100vh-11rem)] min-h-[420px]">
            <aside className={`w-full md:w-80 border-r border-slate-200 flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" /> Messages
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loaded && contacts.length === 0 && (
                        <p className="p-4 text-sm text-slate-500">
                            No contacts yet. Students and teachers appear here once they share a class.
                        </p>
                    )}
                    {contacts.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setActiveId(c.id)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 ${c.id === activeId ? 'bg-indigo-50' : ''
                                }`}
                        >
                            <Avatar c={c} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm text-slate-900 truncate">{c.name}</span>
                                    <span className="text-[11px] text-slate-400 shrink-0">{fmt(c.lastAt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500 truncate">
                                        {c.lastMessage || c.classNames.join(', ') || (c.role === 'TEACHER' ? 'Teacher' : 'Student')}
                                    </span>
                                    {c.unread > 0 && (
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shrink-0">
                                            {c.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            <section className={`flex-1 flex-col min-w-0 ${activeId ? 'flex' : 'hidden md:flex'}`}>
                {!active ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Select a conversation
                    </div>
                ) : (
                    <>
                        <div className="p-3 border-b border-slate-200 flex items-center gap-3">
                            <button onClick={() => setActiveId('')} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <Avatar c={active} />
                            <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">{active.name}</div>
                                <div className="text-xs text-slate-500 truncate">
                                    {active.role === 'TEACHER' ? 'Teacher' : 'Student'}
                                    {active.classNames.length ? ` · ${active.classNames.join(', ')}` : ''}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                            {messages.length === 0 && (
                                <p className="text-center text-sm text-slate-400 mt-8">Say hello to {active.name}.</p>
                            )}
                            {messages.map((m) => {
                                const mine = m.fromId === meId;
                                return (
                                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${mine
                                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                                                }`}
                                        >
                                            {m.content}
                                            <div className={`text-[10px] mt-1 ${mine ? 'text-indigo-200' : 'text-slate-400'} text-right`}>
                                                {fmt(m.timestamp)}
                                                {mine && m.readAt ? ' · Seen' : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={endRef} />
                        </div>
                        <div className="p-3 border-t border-slate-200 flex items-end gap-2">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                rows={1}
                                maxLength={2000}
                                placeholder="Type a message…"
                                className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
                            />
                            <button
                                onClick={send}
                                disabled={!text.trim() || sending}
                                className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}