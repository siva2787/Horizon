import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GitFork,
  AlertTriangle,
  Sparkles,
  Info,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Lock,
  Circle,
  Flag,
  X,
} from 'lucide-react';

type Status = 'Mastered' | 'Learning' | 'Gap' | 'Not Learned';

interface GraphNode {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  masteryScore: number;
  status: Status;
}

interface KnowledgeGraphViewProps {
  onSelectConcept: (conceptId: string) => void;
  onNavigateTutor: (params: any) => void;
  onNavigateAssessment: (conceptId: string) => void;
}

const CARD_W = 196;
const CARD_H = 76;
const COL_GAP = 60;
const V_GAP = 16;
const BAND_GAP = 70;
const PAD = 28;

const STYLE: Record<Status, { hex: string; soft: string; chip: string; label: string; icon: any }> = {
  Mastered: { hex: '#10b981', soft: 'bg-emerald-50', chip: 'bg-emerald-100 text-emerald-800', label: 'Mastered', icon: CheckCircle2 },
  Learning: { hex: '#6366f1', soft: 'bg-indigo-50', chip: 'bg-indigo-100 text-indigo-800', label: 'Learning', icon: TrendingUp },
  Gap: { hex: '#f43f5e', soft: 'bg-rose-50', chip: 'bg-rose-100 text-rose-800', label: 'Gap', icon: AlertTriangle },
  'Not Learned': { hex: '#94a3b8', soft: 'bg-slate-50', chip: 'bg-slate-100 text-slate-700', label: 'Not learned', icon: Circle },
};
const ORDER: Status[] = ['Mastered', 'Learning', 'Gap', 'Not Learned'];

const Ring: React.FC<{ pct: number; color: string; size: number; stroke: number; text?: string; textCls?: string }> = ({
  pct,
  color,
  size,
  stroke,
  text,
  textCls = 'text-[10px]',
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.max(0, Math.min(100, pct))) / 100} ${c}`}
          style={{ transition: 'stroke-dasharray .6s ease' }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-black text-slate-900 ${textCls}`}>
        {text ?? `${pct}%`}
      </div>
    </div>
  );
};

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onSelectConcept,
  onNavigateTutor,
  onNavigateAssessment,
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<{ from: string; to: string }[]>([]);
  const [graphLoading, setGraphLoading] = useState(true);
  const [subjectName, setSubjectName] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [filter, setFilter] = useState<Status | null>(null);
  const [cw, setCw] = useState(700);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/knowledge-graph')
      .then((r) => r.json())
      .then((d) => {
        setSubjectName(d.subjects?.find((x: any) => x.id === d.subjectId)?.name || '');
        const apiNodes: GraphNode[] = (Array.isArray(d.nodes) ? d.nodes : []).map((n: any) => ({
          id: n.id,
          name: n.name,
          description: n.description,
          difficulty: n.difficulty,
          masteryScore: n.masteryScore,
          status: n.status,
        }));
        setNodes(apiNodes);
        setLinks((Array.isArray(d.edges) ? d.edges : []).map((e: any) => ({ from: e.source, to: e.target })));
        setSelectedNodeId((apiNodes.find((n) => n.status === 'Gap') || apiNodes[0])?.id || '');
      })
      .catch(() => setNodes([]))
      .finally(() => setGraphLoading(false));
  }, []);

  // Responsive: measure canvas width and reflow columns to fit
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, [graphLoading, nodes.length]);

  const perRow = Math.max(1, Math.min(4, Math.floor((cw - PAD * 2 + COL_GAP) / (CARD_W + COL_GAP))));

  const layout = useMemo(() => {
    const depth: Record<string, number> = {};
    const depthOf = (id: string, seen: Set<string> = new Set()): number => {
      if (depth[id] !== undefined) return depth[id];
      if (seen.has(id)) return 0;
      seen.add(id);
      const parents = links.filter((l) => l.to === id).map((l) => l.from);
      depth[id] = parents.length ? Math.max(...parents.map((p) => depthOf(p, seen))) + 1 : 0;
      return depth[id];
    };
    nodes.forEach((n) => depthOf(n.id));
    const maxDepth = Math.max(0, ...Object.values(depth));

    const groups: Record<number, GraphNode[]> = {};
    nodes.forEach((n) => (groups[depth[n.id]] = [...(groups[depth[n.id]] || []), n]));

    const rows = Math.floor(maxDepth / perRow) + 1;
    const bandH: number[] = [];
    for (let r = 0; r < rows; r++) {
      let m = 1;
      for (let d = r * perRow; d < Math.min((r + 1) * perRow, maxDepth + 1); d++) m = Math.max(m, (groups[d] || []).length);
      bandH.push(m * CARD_H + (m - 1) * V_GAP);
    }
    const bandTop: number[] = [];
    let acc = PAD;
    bandH.forEach((h) => {
      bandTop.push(acc);
      acc += h + BAND_GAP;
    });
    const height = acc - BAND_GAP + PAD;
    const cols = Math.min(perRow, maxDepth + 1);
    const width = PAD * 2 + cols * CARD_W + (cols - 1) * COL_GAP;

    const pos: Record<string, { x: number; y: number; row: number }> = {};
    Object.entries(groups).forEach(([dStr, list]) => {
      const d = Number(dStr);
      const row = Math.floor(d / perRow);
      let col = d % perRow;
      if (row % 2 === 1) col = cols - 1 - col; // snake layout keeps the chain readable
      const x = PAD + col * (CARD_W + COL_GAP);
      const used = list.length * CARD_H + (list.length - 1) * V_GAP;
      const startY = bandTop[row] + (bandH[row] - used) / 2;
      list.forEach((n, i) => (pos[n.id] = { x, y: startY + i * (CARD_H + V_GAP), row }));
    });
    return { pos, width, height, depth };
  }, [nodes, links, perRow]);

  const byId = (id: string) => nodes.find((n) => n.id === id);
  const selectedNode = byId(selectedNodeId) || nodes[0];
  const prereqsOf = (id: string) => links.filter((l) => l.to === id).map((l) => byId(l.from)).filter(Boolean) as GraphNode[];
  const unlocksOf = (id: string) => links.filter((l) => l.from === id).map((l) => byId(l.to)).filter(Boolean) as GraphNode[];
  const isLocked = (n: GraphNode) => n.masteryScore === 0 && prereqsOf(n.id).some((p) => p.masteryScore < 50);

  const bottleneckFor = (targetId: string) => {
    const target = byId(targetId);
    if (!target || target.status !== 'Gap') return undefined;
    return prereqsOf(targetId)
      .filter((p) => p.status !== 'Mastered' && p.masteryScore < target.masteryScore + 20)
      .sort((a, b) => a.masteryScore - b.masteryScore)[0];
  };
  const insight = (() => {
    for (const n of nodes) {
      const p = bottleneckFor(n.id);
      if (p) return { prereq: p, target: n };
    }
    return undefined;
  })();

  // Recommended next concept: earliest unmastered node whose prerequisites are ready
  const recommended = [...nodes]
    .sort((a, b) => (layout.depth[a.id] ?? 0) - (layout.depth[b.id] ?? 0))
    .find((n) => n.status !== 'Mastered' && prereqsOf(n.id).every((p) => p.masteryScore >= 50));

  if (graphLoading) return <div className="text-sm text-slate-500 p-6">Loading knowledge graph…</div>;
  if (nodes.length === 0 || !selectedNode) return <div className="text-sm text-slate-500 p-6">No concepts available.</div>;

  const counts: Record<Status, number> = { Mastered: 0, Learning: 0, Gap: 0, 'Not Learned': 0 };
  nodes.forEach((n) => (counts[n.status] = (counts[n.status] || 0) + 1));
  const avg = Math.round(nodes.reduce((a, n) => a + n.masteryScore, 0) / nodes.length);

  const prereqs = prereqsOf(selectedNode.id);
  const unlocks = unlocksOf(selectedNode.id);
  const prereqsMet = prereqs.filter((p) => p.masteryScore >= 50).length;
  const sel = STYLE[selectedNode.status];

  const edgePath = (a: string, b: string) => {
    const p = layout.pos[a];
    const q = layout.pos[b];
    if (!p || !q) return '';
    if (p.row === q.row) {
      const right = q.x > p.x;
      const sx = p.x + (right ? CARD_W : 0);
      const tx = q.x + (right ? 0 : CARD_W);
      const sy = p.y + CARD_H / 2;
      const ty = q.y + CARD_H / 2;
      const dx = Math.max(24, Math.abs(tx - sx) / 2);
      const dir = right ? 1 : -1;
      return `M ${sx} ${sy} C ${sx + dir * dx} ${sy}, ${tx - dir * dx} ${ty}, ${tx} ${ty}`;
    }
    const down = q.row > p.row;
    const sx = p.x + CARD_W / 2;
    const tx = q.x + CARD_W / 2;
    const sy = down ? p.y + CARD_H : p.y;
    const ty = down ? q.y : q.y + CARD_H;
    const dy = Math.abs(ty - sy) / 2;
    const dir = down ? 1 : -1;
    return `M ${sx} ${sy} C ${sx} ${sy + dir * dy}, ${tx} ${ty - dir * dy}, ${tx} ${ty}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <style>{`@keyframes kg-flow{to{stroke-dashoffset:-24}}.kg-flow{animation:kg-flow 1s linear infinite}`}</style>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
          <GitFork className="w-3.5 h-3.5" />
          <span>Interactive Prerequisite Network</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Knowledge Graph</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {subjectName ? <strong className="text-slate-700">{subjectName}</strong> : 'Your subject'} · dependency pathways and
          cognitive gaps mapped from your assessments.
        </p>
      </div>

      {/* Mastery overview / filters */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex items-center gap-4 lg:pr-6 lg:border-r border-slate-100">
          <Ring pct={avg} color="#4f46e5" size={64} stroke={8} textCls="text-sm" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject mastery</div>
            <div className="text-sm font-extrabold text-slate-900">
              {counts.Mastered} of {nodes.length} mastered
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
            {ORDER.map(
              (s) =>
                counts[s] > 0 && (
                  <div key={s} style={{ width: `${(counts[s] / nodes.length) * 100}%`, background: STYLE[s].hex }} title={`${STYLE[s].label}: ${counts[s]}`} />
                )
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ORDER.map((s) => {
              const active = filter === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(active ? null : s)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: STYLE[s].hex }} />
                  {STYLE[s].label}
                  <span className={active ? 'text-white/80' : 'text-slate-400'}>{counts[s]}</span>
                </button>
              );
            })}
            {filter && (
              <button
                onClick={() => setFilter(null)}
                className="px-2.5 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Graph canvas */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800">Concept pathway</span>
            <span className="text-[11px] text-slate-400 font-semibold">Select a concept · arrows point to what it unlocks</span>
          </div>

          <div
            ref={wrapRef}
            className="overflow-x-auto"
            style={{
              backgroundImage: 'radial-gradient(#dbe1ea 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundColor: '#f8fafc',
            }}
          >
            <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
              <svg className="absolute inset-0" width={layout.width} height={layout.height}>
                <defs>
                  {(['n', 'g', 'h'] as const).map((k) => (
                    <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={k === 'g' ? '#f43f5e' : k === 'h' ? '#4f46e5' : '#94a3b8'} />
                    </marker>
                  ))}
                </defs>
                {links.map((l, i) => {
                  const a = byId(l.from);
                  const b = byId(l.to);
                  if (!a || !b) return null;
                  const active = l.from === selectedNode.id || l.to === selectedNode.id;
                  const gap = a.status === 'Gap' && b.status === 'Gap';
                  const k = active ? 'h' : gap ? 'g' : 'n';
                  return (
                    <path
                      key={i}
                      d={edgePath(l.from, l.to)}
                      fill="none"
                      stroke={active ? '#4f46e5' : gap ? '#f43f5e' : '#cbd5e1'}
                      strokeWidth={active ? 2.5 : 2}
                      strokeDasharray={active || gap ? '6 6' : undefined}
                      className={active ? 'kg-flow' : undefined}
                      markerEnd={`url(#arrow-${k})`}
                    />
                  );
                })}
              </svg>

              {nodes.map((n) => {
                const p = layout.pos[n.id];
                if (!p) return null;
                const st = STYLE[n.status];
                const Icon = st.icon;
                const isSel = n.id === selectedNode.id;
                const dim = filter !== null && n.status !== filter;
                const locked = isLocked(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      onSelectConcept(n.id);
                    }}
                    className={`absolute text-left rounded-2xl border bg-white px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${isSel ? 'shadow-xl ring-4 ring-indigo-500/20 border-indigo-500' : 'shadow-sm border-slate-200'
                      } ${dim ? 'opacity-25' : ''}`}
                    style={{
                      left: p.x,
                      top: p.y,
                      width: CARD_W,
                      height: CARD_H,
                      borderLeft: `4px solid ${st.hex}`,
                    }}
                  >
                    {recommended?.id === n.id && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-black text-white text-[9px] font-bold flex items-center gap-1 shadow-md">
                        <Flag className="w-2.5 h-2.5" /> Start here
                      </span>
                    )}
                    <div className="flex items-center gap-2.5 h-full">
                      <Ring pct={n.masteryScore} color={st.hex} size={38} stroke={4} text={`${n.masteryScore}`} textCls="text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2">{n.name}</div>
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: st.hex }}>
                          {locked ? <Lock className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                          {locked ? 'Locked' : st.label}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {insight && (
            <div className="m-4 p-4 bg-rose-50/70 rounded-2xl border border-rose-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <span className="leading-relaxed">
                  <strong className="text-slate-900">Bottleneck detected.</strong> {insight.prereq.name} ({insight.prereq.masteryScore}%) is
                  holding back {insight.target.name} ({insight.target.masteryScore}%).
                </span>
              </span>
              <button
                onClick={() => setSelectedNodeId(insight.target.id)}
                className="text-xs font-bold text-rose-600 hover:underline shrink-0 text-left"
              >
                Focus →
              </button>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden lg:sticky lg:top-24">
          <div className={`p-6 ${sel.soft} border-b border-slate-100`}>
            <div className="flex items-center gap-4">
              <Ring pct={selectedNode.masteryScore} color={sel.hex} size={84} stroke={9} textCls="text-lg" />
              <div className="min-w-0">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sel.chip}`}>{sel.label}</span>
                <h2 className="text-lg font-extrabold text-slate-900 leading-tight mt-1.5">{selectedNode.name}</h2>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {selectedNode.description && <p className="text-xs text-slate-500 leading-relaxed">{selectedNode.description}</p>}

            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Difficulty', v: selectedNode.difficulty || '—' },
                { l: 'Prereqs met', v: prereqs.length ? `${prereqsMet}/${prereqs.length}` : 'None' },
                { l: 'Unlocks', v: String(unlocks.length) },
              ].map((s) => (
                <div key={s.l} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.l}</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">{s.v}</div>
                </div>
              ))}
            </div>

            {recommended?.id === selectedNode.id && (
              <div className="p-3.5 rounded-2xl bg-black text-white text-xs flex items-start gap-2.5">
                <Flag className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Recommended next.</strong> Your prerequisites are ready — this is the highest-impact concept to study now.
                </span>
              </div>
            )}

            {(() => {
              const p = bottleneckFor(selectedNode.id);
              return p ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Prerequisite knowledge gap</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    Mastery in <strong>{p.name}</strong> is {p.masteryScore}%. Reinforce it to master {selectedNode.name}.
                  </p>
                </div>
              ) : null;
            })()}

            {[
              { title: 'Prerequisites', list: prereqs },
              { title: 'Unlocks', list: unlocks },
            ].map(
              (g) =>
                g.list.length > 0 && (
                  <div key={g.title}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{g.title}</div>
                    <div className="space-y-1.5">
                      {g.list.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedNodeId(n.id)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-semibold text-slate-700 transition-all"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STYLE[n.status].hex }} />
                            <span className="truncate">{n.name}</span>
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-500">{n.masteryScore}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={() =>
                  onNavigateTutor({
                    conceptId: selectedNode.id,
                    conceptName: selectedNode.name,
                    masteryScore: selectedNode.masteryScore,
                    detectedGap: selectedNode.description,
                    initialPrompt: `Can you explain ${selectedNode.name} in detail and show how it connects to its prerequisites in the ${subjectName || 'course'} knowledge graph?`,
                  })
                }
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">Ask AI Tutor about {selectedNode.name}</span>
              </button>
              <button
                onClick={() => onNavigateAssessment(selectedNode.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Take Practice Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};