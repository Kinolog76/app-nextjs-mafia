'use client';

import { useEffect, useState } from 'react';
import { useRoomStore } from '@/lib/store';
import { TimerIcon } from '@/shared/ui/icons';

const TIMER_LABELS: Record<string, string> = {
  role_reveal: 'Показ ролей',
  night: 'Ночь',
  day: 'Обсуждение',
  speech: 'Речь',
  voting: 'Голосование',
};

function format(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, '0')}`;
}

export default function TimerDisplay() {
  const room = useRoomStore((s) => s.room);
  const offset = useRoomStore((s) => s.serverTimeOffset);
  const [, forceTick] = useState(0);

  const timer = room?.timer ?? null;

  useEffect(() => {
    if (!timer || timer.status !== 'running') return;
    const interval = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(interval);
  }, [timer]);

  if (!timer || timer.status === 'idle') return null;

  let remaining = timer.remainingSeconds;
  if (timer.status === 'running' && timer.startedAt) {
    const serverNow = Date.now() + offset;
    remaining = timer.remainingSeconds - (serverNow - timer.startedAt) / 1000;
  }

  const targetPlayer = timer.targetPlayerId
    ? room?.players.find((p) => p.id === timer.targetPlayerId)
    : null;

  const urgent = timer.status === 'running' && remaining <= 10;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${
        timer.status === 'finished'
          ? 'border-blood-700 bg-blood-700/20 text-blood-400'
          : timer.status === 'paused'
            ? 'border-brass-600/60 bg-brass-600/10 text-brass-400'
            : urgent
              ? 'anim-pulse-ring border-blood-500 bg-ink-900 text-blood-400'
              : 'border-ink-600 bg-ink-900 text-white'
      }`}
    >
      <TimerIcon size={15} />
      <span className="text-xs text-ink-300">{TIMER_LABELS[timer.type] ?? timer.type}</span>
      {targetPlayer && <span className="text-xs text-brass-400">{targetPlayer.nickname}</span>}
      <span className="font-display tabular-nums">
        {timer.status === 'finished' ? 'Время вышло' : format(remaining)}
      </span>
      {timer.status === 'paused' && (
        <span className="text-[10px] uppercase tracking-widest">пауза</span>
      )}
    </div>
  );
}
