import type { Express } from 'express';
import { db } from './db/store.ts';

interface ChatMessage {
    id: string;
    fromId: string;
    toId: string;
    content: string;
    timestamp: string;
    readAt?: string;
}

export function registerChat(app: Express, uid: (req: any) => string, roleOf: (req: any) => string | undefined) {
    const msgs = (): ChatMessage[] => ((db.getState() as any).chatMessages ||= []);

    const peerIds = (me: string, role?: string): Set<string> => {
        const s = db.getState();
        const out = new Set<string>();
        if (role === 'TEACHER') {
            const cids = new Set(s.classrooms.filter((c) => c.teacherId === me).map((c) => c.id));
            s.classMembers.forEach((m) => cids.has(m.classId) && out.add(m.studentId));
        } else {
            const mine = new Set(s.classMembers.filter((m) => m.studentId === me).map((m) => m.classId));
            s.classrooms.forEach((c) => mine.has(c.id) && out.add(c.teacherId));
        }
        return out;
    };

    const canChat = (req: any, peer: string) => peerIds(uid(req), roleOf(req)).has(peer);
    const between = (a: string, b: string) =>
        msgs().filter((m) => (m.fromId === a && m.toId === b) || (m.fromId === b && m.toId === a));

    app.get('/api/chat/contacts', (req, res) => {
        const me = uid(req);
        const s = db.getState();
        const role = roleOf(req);
        const rows = [...peerIds(me, role)]
            .map((id) => {
                const u = s.users.find((x) => x.id === id);
                if (!u) return null;
                const thread = between(me, id);
                const last = thread[thread.length - 1];
                const shared = s.classrooms
                    .filter((c) =>
                        role === 'TEACHER'
                            ? c.teacherId === me && s.classMembers.some((m) => m.classId === c.id && m.studentId === id)
                            : c.teacherId === id && s.classMembers.some((m) => m.classId === c.id && m.studentId === me)
                    )
                    .map((c) => c.name);
                return {
                    id,
                    name: u.name,
                    role: u.role,
                    avatarUrl: u.avatarUrl,
                    classNames: shared,
                    lastMessage: last?.content || '',
                    lastAt: last?.timestamp || '',
                    unread: thread.filter((m) => m.toId === me && !m.readAt).length,
                };
            })
            .filter(Boolean) as any[];
        rows.sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || '') || a.name.localeCompare(b.name));
        res.json(rows);
    });

    app.get('/api/chat/unread', (req, res) => {
        const me = uid(req);
        res.json({ unread: msgs().filter((m) => m.toId === me && !m.readAt).length });
    });

    app.get('/api/chat/:peerId', (req, res) => {
        const me = uid(req);
        const peer = req.params.peerId;
        if (!canChat(req, peer)) return res.status(403).json({ error: 'not_allowed' });
        const thread = between(me, peer);
        const now = new Date().toISOString();
        let changed = false;
        thread.forEach((m) => {
            if (m.toId === me && !m.readAt) {
                m.readAt = now;
                changed = true;
            }
        });
        if (changed) db.save();
        res.json(thread.slice(-200));
    });

    app.post('/api/chat/:peerId', (req, res) => {
        const me = uid(req);
        const peer = req.params.peerId;
        if (!canChat(req, peer)) return res.status(403).json({ error: 'not_allowed' });
        const content = String(req.body?.content || '').trim().slice(0, 2000);
        if (!content) return res.status(400).json({ error: 'empty' });
        const msg: ChatMessage = {
            id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            fromId: me,
            toId: peer,
            content,
            timestamp: new Date().toISOString(),
        };
        msgs().push(msg);
        db.save();
        res.json(msg);
    });
}