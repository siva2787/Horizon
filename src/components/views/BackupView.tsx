import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, CloudUpload, CloudDownload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Status {
    enabled: boolean;
    bucket: string;
    lastBackupAt: string | null;
    lastError: string | null;
    pending: boolean;
}

export const BackupView: React.FC = () => {
    const [status, setStatus] = useState<Status | null>(null);
    const [busy, setBusy] = useState<'' | 'backup' | 'restore'>('');
    const [msg, setMsg] = useState('');

    const load = () =>
        fetch('/api/teacher/backup/status')
            .then((r) => r.json())
            .then(setStatus)
            .catch(() => setMsg('Failed to load status'));

    useEffect(() => {
        load();
        const t = setInterval(load, 10000);
        return () => clearInterval(t);
    }, []);

    const backup = async () => {
        setBusy('backup');
        setMsg('');
        try {
            const r = await fetch('/api/teacher/backup/now', { method: 'POST' });
            const s: Status = await r.json();
            setStatus(s);
            setMsg(s.lastError ? 'Backup failed' : 'Backup completed');
        } catch {
            setMsg('Backup failed');
        }
        setBusy('');
    };

    const restore = async () => {
        if (!window.confirm('Replace ALL current data with the latest cloud backup? This cannot be undone.')) return;
        setBusy('restore');
        setMsg('');
        try {
            const r = await fetch('/api/teacher/backup/restore', { method: 'POST' });
            const d = await r.json();
            setMsg(d.message || (r.ok ? 'Restored' : 'Restore failed'));
            if (r.ok) setTimeout(() => window.location.reload(), 1200);
        } catch {
            setMsg('Restore failed');
        }
        setBusy('');
    };

    const on = !!status?.enabled;

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-1">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Data Safety</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Cloud Backup</h1>
                <p className="text-xs text-slate-500">Automatic backup of all app data so nothing is lost if the server crashes.</p>
            </div>

            {!status ? (
                <div className="py-10 flex justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 max-w-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {on ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">{on ? 'Cloud storage connected' : 'Cloud storage not configured'}</div>
                            <div className="text-xs text-slate-500">
                                {on ? `Bucket: ${status.bucket}` : 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY on the server'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Last backup</div>
                            <div className="font-bold text-slate-900">
                                {status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString() : 'No backup yet'}
                            </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</div>
                            <div className="font-bold flex items-center gap-1.5">
                                {status.lastError ? (
                                    <span className="text-rose-600 inline-flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Error
                                    </span>
                                ) : status.pending ? (
                                    <span className="text-amber-600 inline-flex items-center gap-1">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing
                                    </span>
                                ) : (
                                    <span className="text-emerald-600 inline-flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Up to date
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {status.lastError && <div className="text-xs text-rose-600 break-words">{status.lastError}</div>}

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={backup}
                            disabled={!on || !!busy}
                            className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {busy === 'backup' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                            <span>Backup Now</span>
                        </button>
                        <button
                            onClick={restore}
                            disabled={!on || !!busy}
                            className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {busy === 'restore' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
                            <span>Restore From Cloud</span>
                        </button>
                    </div>
                    {msg && <div className="text-xs font-semibold text-slate-600">{msg}</div>}
                </div>
            )}
        </div>
    );
};