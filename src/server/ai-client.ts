import fs from 'fs';
import path from 'path';
import { db } from './db/store.ts';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const key = () => process.env.GEMINI_API_KEY || '';
const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
        const generationConfig: any = {
            temperature: opts.temperature ?? 0.6,
            maxOutputTokens: opts.maxTokens ?? 1024,
        };
        if (opts.json) generationConfig.responseMimeType = 'application/json';
        if (m.includes('2.5')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: opts.system }] },
                contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
                generationConfig,
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            console.error('AI request failed:', res.status, (await res.text()).slice(0, 300));
            return null;
        }
        const data: any = await res.json();
        const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
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