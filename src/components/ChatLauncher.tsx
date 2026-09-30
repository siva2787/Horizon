import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ChatLauncherProps {
    /** Tooltip / accessible label, e.g. "Teachers Chat" or "Students Chat" */
    label: string;
    /** Number of unread messages (badge is hidden when 0) */
    unread?: number;
    onClick: () => void;
}

/**
 * Round launcher for the teacher <-> student messaging screen.
 * Sits directly to the left of the AI assistant launcher, same size and baseline.
 * White surface + black icon so it reads as "people chat", clearly different
 * from the gradient AI assistant button.
 */
export const ChatLauncher: React.FC<ChatLauncherProps> = ({ label, unread = 0, onClick }) => (
    <div className="fixed bottom-5 right-[5.75rem] z-40 group">
        <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-neutral-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {label}
        </span>
        <button
            onClick={onClick}
            aria-label={label}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-950 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)] ring-4 ring-black/5 transition hover:border-neutral-300 hover:bg-neutral-50"
        >
            <MessageSquare className="h-6 w-6" strokeWidth={2} />
            {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </button>
    </div>
);