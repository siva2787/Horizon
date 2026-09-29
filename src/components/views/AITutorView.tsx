import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Brain,
  Lightbulb,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import { TutorMessage } from '../../types.ts';

interface AITutorViewProps {
  conceptId?: string;
  conceptName?: string;
  masteryScore?: number;
  detectedGap?: string;
  studentName?: string;
  initialPrompt?: string;
}

interface VideoItem {
  title: string;
  url: string;
  channel?: string;
  thumbnail?: string;
}

const ytSearch = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const buildFallbackVideos = (conceptName: string, detectedGap?: string): VideoItem[] => {
  const prereq = (detectedGap || '').replace(/^Weak prerequisite in\s*/i, '').trim();
  const list: VideoItem[] = [
    {
      title: `${conceptName} explained simply`,
      url: ytSearch(`${conceptName} explained simply`),
    },
    {
      title: `${conceptName} step-by-step worked examples`,
      url: ytSearch(`${conceptName} step by step worked examples`),
    },
  ];
  if (prereq) {
    list.push({
      title: `Prerequisite: ${prereq}`,
      url: ytSearch(`${prereq} tutorial`),
    });
  }
  return list;
};

export const AITutorView: React.FC<AITutorViewProps> = ({
  conceptId = 'c_bayes',
  conceptName = 'Bayes Theorem',
  masteryScore = 38,
  detectedGap = 'Weak prerequisite in Conditional Probability P(A|B)',
  studentName = 'Learner',
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>(() =>
    buildFallbackVideos(conceptName, detectedGap)
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredPromptRef = useRef<string | null>(null);

  const quickActions = [
    { label: 'Explain', action: 'Explain', icon: Lightbulb },
    { label: 'Simplify', action: 'Simplify', icon: HelpCircle },
    { label: 'Give Example', action: 'Example', icon: Brain },
    { label: 'Quiz Me', action: 'Quiz Me', icon: CheckCircle2 },
    { label: 'Give Hint', action: 'Give Hint', icon: Sparkles },
    { label: 'Explain Visually', action: 'Explain Visually', icon: ImageIcon },
    { label: 'Watch Videos', action: 'Videos', icon: Youtube },
  ];

  // Load video recommendations: server (YouTube API) if available, else search links.
  useEffect(() => {
    const fallback = buildFallbackVideos(conceptName, detectedGap);
    setVideos(fallback);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/tutor/videos?q=${encodeURIComponent(conceptName)}&conceptId=${encodeURIComponent(conceptId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.videos) && data.videos.length > 0) {
          setVideos(
            data.videos.slice(0, 4).map((v: any): VideoItem => ({
              title: v.title,
              url: v.url || (v.id ? `https://www.youtube.com/watch?v=${v.id}` : ytSearch(v.title)),
              channel: v.channel,
              thumbnail: v.thumbnail || (v.id ? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` : undefined),
            }))
          );
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conceptId, conceptName, detectedGap]);

  useEffect(() => {
    const initTutor = async () => {
      try {
        const res = await fetch(`/api/tutor/history?conceptId=${conceptId}`);
        const data = await res.json();
        let initialMsgs: TutorMessage[] = [];

        if (data.messages && data.messages.length > 0) {
          initialMsgs = data.messages;
        } else {
          initialMsgs = [
            {
              id: 'init_welcome',
              conversationId: 'conv_1',
              sender: 'TUTOR',
              content: `Hello **${studentName}**! I am your AI Learning Twin Tutor. I see you're focusing on **${conceptName}** (Mastery: **${masteryScore}%**).\n\n${detectedGap ? `**Prerequisite Flag:** ${detectedGap}` : ''
                }\n\nHow can I help you master this concept today?`,
              timestamp: new Date().toISOString(),
            },
          ];
        }
        setMessages(initialMsgs);

        if (initialPrompt && hasTriggeredPromptRef.current !== initialPrompt) {
          hasTriggeredPromptRef.current = initialPrompt;
          setTimeout(() => {
            handleSendMessage(initialPrompt);
          }, 350);
        }
      } catch (err) {
        console.error('Failed to init tutor history:', err);
      }
    };

    initTutor();
  }, [conceptId, conceptName, masteryScore, studentName, initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const showVideosInChat = () => {
    const now = Date.now();
    const links = videos
      .map((v) => `- [${v.title}](${v.url})${v.channel ? ` — ${v.channel}` : ''}`)
      .join('\n');
    setMessages((prev) => [
      ...prev,
      {
        id: `usr_${now}`,
        conversationId: 'active',
        sender: 'USER',
        content: `Recommend videos for ${conceptName}`,
        timestamp: new Date(now).toISOString(),
      },
      {
        id: `vid_${now}`,
        conversationId: 'active',
        sender: 'TUTOR',
        content: `Here are YouTube videos to help with **${conceptName}**:\n\n${links}`,
        timestamp: new Date(now).toISOString(),
      },
    ]);
  };

  const handleSendMessage = async (text: string, action?: string) => {
    if (!text.trim() || loading) return;

    const userMessage: TutorMessage = {
      id: `usr_${Date.now()}`,
      conversationId: 'active',
      sender: 'USER',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/tutor/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          message: text,
          action,
        }),
      });

      if (!res.ok) {
        throw new Error(`Tutor request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.tutorMessage) {
        setMessages((prev) => [...prev, data.tutorMessage]);
      } else {
        throw new Error('Tutor response missing tutorMessage');
      }
    } catch (err) {
      console.error('Failed to reach AI tutor:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          conversationId: 'active',
          sender: 'TUTOR',
          content: "I couldn't reach your learning twin context just now. Please check your connection and try asking again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isVideoAsk = (t: string) => /\b(video|youtube|watch)\b/i.test(t);

  const submitInput = (text: string) => {
    if (!text.trim() || loading) return;
    handleSendMessage(text);
    if (isVideoAsk(text)) {
      // Append recommendations after the tutor's reply lands.
      const check = setInterval(() => {
        setLoading((l) => {
          if (!l) {
            clearInterval(check);
            setMessages((prev) => {
              const now = Date.now();
              const links = videos
                .map((v) => `- [${v.title}](${v.url})${v.channel ? ` — ${v.channel}` : ''}`)
                .join('\n');
              return [
                ...prev,
                {
                  id: `vid_${now}`,
                  conversationId: 'active',
                  sender: 'TUTOR',
                  content: `**Recommended videos:**\n\n${links}`,
                  timestamp: new Date(now).toISOString(),
                },
              ];
            });
          }
          return l;
        });
      }, 400);
      setTimeout(() => clearInterval(check), 30000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Context-Aware AI Tutor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            AI Tutor
          </h1>
          <p className="text-xs text-slate-500">
            Tailored explanations injected with your specific learning twin gaps and mastery scores.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-emerald-800 text-xs font-bold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Twin Synced Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Session Focus
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{conceptName}</h2>
              <p className="text-xs text-slate-500">Class AI Tutor</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Current Concept Mastery</span>
                <span className="text-rose-600 font-extrabold">{masteryScore}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${masteryScore}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Detected Prerequisite Bottleneck</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">{detectedGap}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700">Quick Prompt Shortcuts</span>
              <div className="flex flex-col gap-1.5">
                {quickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.action}
                      onClick={() =>
                        qa.action === 'Videos'
                          ? showVideosInChat()
                          : handleSendMessage(`${qa.label} for ${conceptName}`, qa.action)
                      }
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{qa.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Youtube className="w-4 h-4 text-red-600" />
                <span>Recommended Videos</span>
              </div>
              <div className="flex flex-col gap-2">
                {videos.map((v, i) => (
                  <a
                    key={`${v.url}_${i}`}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                  >
                    {v.thumbnail ? (
                      <img
                        src={v.thumbnail}
                        alt=""
                        className="w-16 h-10 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                        <Youtube className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-800 leading-snug line-clamp-2">
                        {v.title}
                      </div>
                      {v.channel && (
                        <div className="text-[10px] text-slate-500 truncate">{v.channel}</div>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[640px] overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">AI Twin Tutor</div>
                <div className="text-[10px] text-slate-500">Grounding responses with your mastery history</div>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-400">Interactive Dialogue</div>
          </div>

          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
            {initialPrompt && (
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-100/90 rounded-2xl p-3.5 shadow-2xs flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0 animate-pulse" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-indigo-950 flex items-center gap-2">
                    <span>Context-Injected Navigation Prompt</span>
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                      {conceptName} ({masteryScore}%)
                    </span>
                  </div>
                  <p className="text-indigo-900 font-semibold italic">"{initialPrompt}"</p>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.sender === 'USER';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${isUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                      }`}
                  >
                    {isUser ? 'U' : <Sparkles className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${isUser
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                        : 'bg-white border border-slate-200/90 text-slate-800 shadow-xs rounded-tl-none'
                      }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="tutor-markdown-content">
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 hover:underline font-semibold"
                              />
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div
                      className={`text-[10px] mt-2 font-mono ${isUser ? 'text-indigo-200 text-right' : 'text-slate-400'
                        }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center animate-spin">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 italic shadow-xs flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                  <span>Thinking & referencing your prerequisite gaps...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitInput(inputText);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask about ${conceptName} or request an intuitive analogy...`}
                className="flex-1 px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};