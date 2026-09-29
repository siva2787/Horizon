import { Question } from '../types.ts';

const STOP = new Set(
  'about above after again against because before being below between both could during each from further have having here herself himself into itself just more most other over same should some such than that their them then there these they this those through under until very were what when where which while will with would your also been does doing done only onto upon than then thus using used uses make made many much must shall may might can cannot within without across along among around'.split(
    ' '
  )
);

const tokens = (s: string) => (s.toLowerCase().match(/[a-z][a-z\-]{3,}/g) || []).filter((w) => !STOP.has(w));

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Local, offline question generator: cloze MCQs built from document sentences. */
export function generateQuestionsFromText(text: string, conceptId: string, idPrefix: string, max = 8): Question[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = (clean.match(/[^.!?]{40,220}[.!?]/g) || []).map((s) => s.trim());
  if (sentences.length === 0) return [];

  const freq = new Map<string, number>();
  tokens(clean).forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  const vocab = [...freq.entries()]
    .filter(([w]) => w.length >= 5)
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length)
    .map(([w]) => w);
  if (vocab.length < 4) return [];

  const scored = sentences
    .map((s) => {
      const toks = tokens(s).filter((w) => w.length >= 5 && freq.has(w));
      const best = toks.sort((a, b) => (freq.get(b)! * b.length) - (freq.get(a)! * a.length))[0];
      return { s, best, score: toks.length };
    })
    .filter((x) => x.best && x.score >= 2)
    .sort((a, b) => b.score - a.score);

  const out: Question[] = [];
  const used = new Set<string>();
  for (const { s, best } of scored) {
    if (out.length >= max) break;
    if (used.has(best)) continue;
    used.add(best);
    const re = new RegExp(`\\b${best}\\b`, 'i');
    const blanked = s.replace(re, '_____');
    if (blanked === s) continue;
    const distractors = vocab.filter((w) => w !== best && !s.toLowerCase().includes(w)).slice(0, 12);
    const h = hash(s);
    const picked: string[] = [];
    for (let i = 0; picked.length < 3 && i < distractors.length; i++) {
      const w = distractors[(h + i * 5) % distractors.length];
      if (!picked.includes(w)) picked.push(w);
    }
    if (picked.length < 3) continue;
    const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
    const options = [best, ...picked].map(cap);
    const shift = h % 4;
    const rotated = options.map((_, i) => options[(i + shift) % 4]);
    const n = out.length;
    out.push({
      id: `${idPrefix}_${n + 1}`,
      conceptId,
      difficulty: n < 3 ? 'Easy' : n < 6 ? 'Medium' : 'Hard',
      question: `Fill in the blank: ${blanked}`,
      options: rotated,
      correctAnswer: cap(best),
      explanation: `From the study material: ${s}`,
      hint: 'Recall the key term from your class study material.',
    });
  }
  return out;
}

/** Local retrieval: top sentences from texts that overlap with the query. */
export function retrieveSnippets(query: string, texts: string[], k = 3): string[] {
  const q = new Set(tokens(query));
  if (q.size === 0) return [];
  const cands: { s: string; sc: number }[] = [];
  for (const t of texts) {
    const sents = t.replace(/\s+/g, ' ').match(/[^.!?]{30,300}[.!?]/g) || [];
    for (const s of sents) {
      const st = tokens(s);
      const sc = st.filter((w) => q.has(w)).length;
      if (sc > 0) cands.push({ s: s.trim(), sc });
    }
  }
  return cands.sort((a, b) => b.sc - a.sc).slice(0, k).map((c) => c.s);
}
