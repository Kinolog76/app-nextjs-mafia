'use client';

import { XIcon } from './icons';

type Props = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
};

export default function Drawer({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <>
      <div className="anim-fade-in fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,92vw)] flex-col border-l border-ink-700 bg-ink-900 shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 className="font-display flex items-center gap-2 text-sm font-bold text-white">
            {title}
          </h2>
          <button className="btn-ghost !p-2" onClick={onClose} title="Закрыть">
            <XIcon size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
