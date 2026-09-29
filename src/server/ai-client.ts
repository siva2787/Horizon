import fs from 'fs';
import path from 'path';
import { db } from './db/store.ts';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const key = () => process.env.GROQ_API_KEY || '';
const model = () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export const aiEnabled = () => Boolean(key());

export async function aiGenerate(opts: {
    system: string;
    prompt: string;
    json?: boolean;
    maxTokens?: number;
    temperature?: number;
}): Promise<string | null> {
    if (!aiEnabled()) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
        const m = model();
        const body: any = {
            model: m,
            messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content: opts.prompt },
            ],
            temperature: opts.temperature ?? 0.6,
            max_completion_tokens: (opts.maxTokens ?? 1024) + 1024,
        };
        if (m.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
        if (opts.json) body.response_format = { type: 'json_object' };
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key()}` },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            console.error('AI request failed:', res.status, (await res.text()).slice(0, 300));
            return null;
        }
        const data: any = await res.json();
        const text = String(data.choices?.[0]?.message?.content || '').trim();
        return text || null;
    } catch (err) {
        console.error('AI call error:', err);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

const usage = new Map<string, number>();
/** Per-student daily cap so the API key is only spent when needed. */
export function withinBudget(studentId: string, kind: string, limit: number): boolean {
    const k = `${studentId}:${kind}:${new Date().toISOString().slice(0, 10)}`;
    const n = usage.get(k) || 0;
    if (n >= limit) return false;
    usage.set(k, n + 1);
    return true;
}

/** Teacher-uploaded study material (extracted text) available to a student for a concept. */
export function getMaterialTexts(studentId: string, conceptId: string): string[] {
    const state = db.getState();
    const concept = state.concepts.find((c) => c.id === conceptId);
    if (!concept) return [];
    const mine = new Set(db.getStudentClassIds(studentId));
    const classIds = new Set(
        state.classrooms.filter((c) => mine.has(c.id) && c.subjectIds.includes(concept.subjectId)).map((c) => c.id)
    );
    const files = state.studyFiles.filter((f) => classIds.has(f.classId) && f.hasText);
    const topic = files.filter((f) => f.conceptId === conceptId);
    const out: string[] = [];
    for (const f of topic.length ? topic : files) {
        try {
            out.push(fs.readFileSync(path.join(UPLOAD_DIR, `${f.id}.txt`), 'utf-8'));
        } catch {
            // no extracted text
        }
    }
    return out;
}