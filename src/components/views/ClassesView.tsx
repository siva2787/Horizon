import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Upload,
  FileText,
  Users,
  BookOpen,
  LogIn,
  LogOut,
  Download,
  X,
  Layers,
  HelpCircle,
  School,
  AlertCircle,
} from 'lucide-react';

interface Props {
  role: 'TEACHER' | 'STUDENT';
  onChanged: () => void;
  onOpenSubject?: () => void;
  onStartDiagnostic?: () => void;
}

const inp =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';
const btn =
  'px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 whitespace-nowrap';
const label = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';

const api = async (url: string, method = 'GET', body?: unknown) => {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const toB64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Read failed'));
    r.readAsDataURL(file);
  });

const accents = ['from-black to-neutral-800'];

const Header: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div>
    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">{sub}</p>
  </div>
);

const ErrorBanner: React.FC<{ msg: string }> = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  ) : null;

const Empty: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-slate-400">
    <Icon className="w-7 h-7" />
    <span className="text-xs font-medium">{text}</span>
  </div>
);

export const ClassesView: React.FC<Props> = ({ role, onChanged, onStartDiagnostic }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState('');
  const [tab, setTab] = useState<Record<string, string>>({});
  const [subName, setSubName] = useState<Record<string, string>>({});
  const [topicName, setTopicName] = useState<Record<string, string>>({});
  const [uploadTopic, setUploadTopic] = useState<Record<string, string>>({});
  const [q, setQ] = useState<Record<string, any>>({});
  const [diagRequired, setDiagRequired] = useState(false);
  const fileRef = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    try {
      setClasses(await api('/api/classes'));
      if (role === 'TEACHER') setCatalog(await api('/api/catalog'));
      else setDiagRequired(Boolean((await api('/api/diagnostic/status')).required));
    } catch (e: any) {
      setErr(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await load();
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = (cls: any, file: File) =>
    run(async () => {
      const dataBase64 = await toB64(file);
      await api(`/api/classes/${cls.id}/files`, 'POST', {
        name: file.name,
        mimeType: file.type,
        dataBase64,
        topicId: uploadTopic[cls.id] || undefined,
      });
    });

  const copyCode = (c: any) => {
    navigator.clipboard?.writeText(c.code);
    setCopied(c.id);
    setTimeout(() => setCopied(''), 1500);
  };

  if (role === 'STUDENT') {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <Header
          title="My Classes"
          sub="Enter the room code from your teacher. Your subjects, topics and quizzes come only from your classes."
        />

        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <LogIn className="w-4 h-4 text-purple-300" />
              Join a classroom
            </div>
            <p className="text-xs text-indigo-200 mt-1">Ask your teacher for the 6–8 character room code.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 text-sm font-mono uppercase tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-white/30 w-full md:w-52"
              placeholder="ROOM CODE"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-xs font-extrabold hover:bg-indigo-50 transition-all disabled:opacity-50"
              disabled={busy || !code.trim()}
              onClick={() =>
                run(async () => {
                  await api('/api/classes/join', 'POST', { code });
                  setCode('');
                })
              }
            >
              Join
            </button>
          </div>
        </div>

        <ErrorBanner msg={err} />
        {classes.length === 0 && <Empty icon={School} text="You have not joined any class yet." />}

        <div className="space-y-6">
          {classes.map((c, i) => (
            <div key={c.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${accents[i % accents.length]}`} />
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accents[i % accents.length]} text-white flex items-center justify-center font-extrabold shadow-md`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-lg leading-tight">{c.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Teacher: <span className="font-semibold text-slate-700">{c.teacherName}</span> ·{' '}
                        <span className="font-mono tracking-widest">{c.code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {diagRequired && (
                      <button className={btn} onClick={() => onStartDiagnostic?.()}>
                        <HelpCircle className="w-3.5 h-3.5" />
                        Perform Diagnostic Test
                      </button>
                    )}
                    <button
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      onClick={() => run(() => api(`/api/classes/${c.id}/leave`, 'POST'))}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave
                    </button>
                  </div>
                </div>

                <div>
                  <div className={`${label} mb-2`}>Subjects</div>
                  {c.subjects.length === 0 ? (
                    <Empty icon={BookOpen} text="Your teacher has not added subjects yet." />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {c.subjects.map((s: any) => (
                        <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            {s.name}
                          </div>
                          <ol className="mt-3 space-y-1.5">
                            {s.topics.map((t: any, n: number) => (
                              <li key={t.id} className="flex items-center justify-between text-xs text-slate-600">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center justify-center">
                                    {n + 1}
                                  </span>
                                  {t.name}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  {t.questionCount} Qs
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {c.files.length > 0 && (
                  <div>
                    <div className={`${label} mb-2`}>Study files</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {c.files.map((f: any) => (
                        <a
                          key={f.id}
                          href={`/api/files/${f.id}?sid=${sessionStorage.getItem('zone_sid') || ''}`}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-semibold text-slate-700 transition-all"
                        >
                          <Download className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <Header
        title="Classrooms"
        sub="Create a room, share its code, add subjects/topics and upload study files. Quizzes are generated locally from your files."
      />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 sm:w-64 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900">New classroom</div>
            <div className="text-[11px] text-slate-500">A unique join code is generated</div>
          </div>
        </div>
        <div className="flex gap-2 flex-1">
          <input
            className={inp}
            placeholder="e.g. AI & DS – III"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            className={btn}
            disabled={busy || !newName.trim()}
            onClick={() =>
              run(async () => {
                await api('/api/classes', 'POST', { name: newName });
                setNewName('');
              })
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        </div>
      </div>

      <ErrorBanner msg={err} />
      {classes.length === 0 && <Empty icon={School} text="No classrooms yet. Create your first one above." />}

      <div className="space-y-6">
        {classes.map((c, i) => {
          const editable = c.subjects.filter((s: any) => s.editable);
          const topics = editable.flatMap((s: any) => s.topics.map((t: any) => ({ ...t, subject: s.name })));
          const qs = q[c.id] || { topicId: '', question: '', options: ['', '', '', ''], correct: -1 };
          const active = tab[c.id] || 'subjects';
          const tabs = [
            { id: 'subjects', label: 'Subjects & Topics', icon: Layers, n: c.subjects.length },
            { id: 'files', label: 'Study Files', icon: FileText, n: c.files.length },
            { id: 'students', label: 'Students', icon: Users, n: c.students.length },
            ...(topics.length > 0 ? [{ id: 'question', label: 'Add Question', icon: HelpCircle, n: undefined }] : []),
          ];
          const available = catalog.filter((x) => !c.subjects.some((s: any) => s.id === x.id));

          return (
            <div key={c.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className={`bg-gradient-to-r ${accents[i % accents.length]} p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div>
                  <div className="text-xl font-extrabold tracking-tight">{c.name}</div>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-semibold text-white/90">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20">{c.subjects.length} subjects</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20">{c.files.length} files</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20">{c.students.length} students</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCode(c)}
                    title="Copy join code"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 transition-all"
                  >
                    <span className="font-mono text-lg font-bold tracking-[0.25em]">{c.code}</span>
                    {copied === c.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    title="Delete class"
                    className="p-2.5 rounded-xl bg-white/15 hover:bg-rose-500 border border-white/25 transition-all"
                    onClick={() =>
                      confirm('Delete this class and its content?') && run(() => api(`/api/classes/${c.id}`, 'DELETE'))
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 sm:px-6 pt-4 border-b border-slate-100 flex gap-1 overflow-x-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab({ ...tab, [c.id]: t.id })}
                    className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition-all ${active === t.id
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.n !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">{t.n}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {active === 'subjects' && (
                  <>
                    {c.subjects.length === 0 && <Empty icon={Layers} text="No subjects yet. Add one below." />}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {c.subjects.map((s: any) => (
                        <div key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-500" />
                              {s.name}
                              {!s.editable && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                  Built-in
                                </span>
                              )}
                            </div>
                            <button
                              className="text-[11px] font-bold text-rose-600 hover:underline"
                              onClick={() => run(() => api(`/api/classes/${c.id}/subjects/${s.id}`, 'DELETE'))}
                            >
                              Remove
                            </button>
                          </div>
                          <ol className="space-y-1.5">
                            {s.topics.map((t: any, n: number) => (
                              <li
                                key={t.id}
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs text-slate-700"
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {n + 1}
                                  </span>
                                  <span className="truncate">{t.name}</span>
                                </span>
                                <span className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {t.questionCount} Qs
                                  </span>
                                  {s.editable && (
                                    <button
                                      title="Remove topic"
                                      className="text-slate-300 hover:text-rose-500 transition-colors"
                                      onClick={() => run(() => api(`/api/classes/${c.id}/topics/${t.id}`, 'DELETE'))}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ol>
                          {s.editable && (
                            <div className="flex gap-2">
                              <input
                                className={inp}
                                placeholder="Add topic / unit"
                                value={topicName[s.id] || ''}
                                onChange={(e) => setTopicName({ ...topicName, [s.id]: e.target.value })}
                              />
                              <button
                                className={btn}
                                disabled={busy || !(topicName[s.id] || '').trim()}
                                onClick={() =>
                                  run(async () => {
                                    await api(`/api/classes/${c.id}/subjects/${s.id}/topics`, 'POST', {
                                      name: topicName[s.id],
                                    });
                                    setTopicName({ ...topicName, [s.id]: '' });
                                  })
                                }
                              >
                                Add
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 space-y-3">
                      <div className={label}>Add a subject</div>
                      <div className="flex gap-2">
                        <input
                          className={inp}
                          placeholder="New subject name"
                          value={subName[c.id] || ''}
                          onChange={(e) => setSubName({ ...subName, [c.id]: e.target.value })}
                        />
                        <button
                          className={btn}
                          disabled={busy || !(subName[c.id] || '').trim()}
                          onClick={() =>
                            run(async () => {
                              await api(`/api/classes/${c.id}/subjects`, 'POST', { name: subName[c.id] });
                              setSubName({ ...subName, [c.id]: '' });
                            })
                          }
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add subject
                        </button>
                      </div>
                      {available.length > 0 && (
                        <select
                          className={inp}
                          value=""
                          onChange={(e) =>
                            e.target.value &&
                            run(() => api(`/api/classes/${c.id}/subjects`, 'POST', { catalogSubjectId: e.target.value }))
                          }
                        >
                          <option value="">Or add a built-in subject…</option>
                          {available.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}

                {active === 'files' && (
                  <>
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 flex flex-col sm:flex-row gap-2">
                      <select
                        className={inp}
                        value={uploadTopic[c.id] || ''}
                        onChange={(e) => setUploadTopic({ ...uploadTopic, [c.id]: e.target.value })}
                      >
                        <option value="">No topic (reference only)</option>
                        {topics.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.subject} › {t.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="file"
                        hidden
                        ref={(el) => {
                          fileRef.current[c.id] = el;
                        }}
                        accept=".pdf,.docx,.txt,.md,.csv,.html"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) upload(c, f);
                          e.target.value = '';
                        }}
                      />
                      <button className={btn} disabled={busy} onClick={() => fileRef.current[c.id]?.click()}>
                        <Upload className="w-3.5 h-3.5" />
                        {busy ? 'Working…' : 'Upload'}
                      </button>
                    </div>
                    {c.files.length === 0 && <Empty icon={FileText} text="No study files uploaded yet." />}
                    <div className="space-y-2">
                      {c.files.map((f: any) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{f.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {f.hasText ? `${f.questionsGenerated} questions generated` : 'no text extracted'}
                              </div>
                            </div>
                          </div>
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                            onClick={() => run(() => api(`/api/classes/${c.id}/files/${f.id}`, 'DELETE'))}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {active === 'students' && (
                  <>
                    {c.students.length === 0 && <Empty icon={Users} text="No students have joined yet. Share the code." />}
                    <div className="space-y-2">
                      {c.students.map((s: any) => (
                        <div
                          key={s.studentId}
                          className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {(s.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
                              <div className="text-[11px] text-slate-400 truncate">{s.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-40 shrink-0">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                style={{ width: `${s.mastery}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-slate-900 w-9 text-right">{s.mastery}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {active === 'question' && (
                  <div className="space-y-3 max-w-2xl">
                    <select
                      className={inp}
                      value={qs.topicId}
                      onChange={(e) => setQ({ ...q, [c.id]: { ...qs, topicId: e.target.value } })}
                    >
                      <option value="">Select topic</option>
                      {topics.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.subject} › {t.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inp}
                      placeholder="Question"
                      value={qs.question}
                      onChange={(e) => setQ({ ...q, [c.id]: { ...qs, question: e.target.value } })}
                    />
                    <div className="text-[11px] text-slate-400">Required: select the radio button next to the correct answer.</div>
                    {qs.options.map((o: string, n: number) => (
                      <div key={n} className="flex gap-3 items-center">
                        <input
                          type="radio"
                          className="accent-indigo-600"
                          checked={qs.correct === n}
                          onChange={() => setQ({ ...q, [c.id]: { ...qs, correct: n } })}
                        />
                        <input
                          className={inp}
                          placeholder={`Option ${n + 1}`}
                          value={o}
                          onChange={(e) => {
                            const opts = [...qs.options];
                            opts[n] = e.target.value;
                            setQ({ ...q, [c.id]: { ...qs, options: opts } });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      className={btn}
                      disabled={
                        busy ||
                        !qs.topicId ||
                        !qs.question.trim() ||
                        qs.options.filter((o: string) => o.trim()).length < 2 ||
                        qs.correct < 0 ||
                        !(qs.options[qs.correct] || '').trim()
                      }
                      onClick={() =>
                        run(async () => {
                          await api(`/api/classes/${c.id}/questions`, 'POST', {
                            topicId: qs.topicId,
                            question: qs.question,
                            options: qs.options.map((o: string) => o.trim()).filter(Boolean),
                            correctAnswer: qs.options[qs.correct].trim(),
                          });
                          setQ({ ...q, [c.id]: undefined });
                        })
                      }
                    >
                      Save question
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};