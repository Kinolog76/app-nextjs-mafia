'use client';

import { useState } from 'react';
import { emitWithAck } from '@/lib/socket';
import { useRoomStore } from '@/lib/store';
import { ROLE_INFO, WINNER_LABELS } from '@/shared/roles';
import VideoGrid from '../video/VideoGrid';
import MediaBar from '../video/MediaBar';
import {
  CrownIcon,
  ExitIcon,
  EyeIcon,
  FedoraIcon,
  LogoMark,
  ManiacIcon,
  ReviveIcon,
  RoleIcon,
  SunIcon,
} from '@/shared/ui/icons';

export default function Results({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  if (!room || !selfId) return null;
  const isHost = room.hostPlayerId === selfId;
  const winner = room.winner ?? 'none';

  const restart = async () => {
    setError(null);
    try {
      await emitWithAck('game:restart', { roomId, hostPlayerId: selfId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const accent =
    winner === 'mafia'
      ? 'var(--color-blood-500)'
      : winner === 'civilians'
        ? 'var(--color-brass-500)'
        : winner === 'maniac'
          ? 'var(--color-violet-500, #8b5cf6)'
          : 'var(--color-ink-400)';

  const winnerIcon = (size: number) =>
    winner === 'mafia' ? (
      <FedoraIcon size={size} />
    ) : winner === 'civilians' ? (
      <SunIcon size={size} />
    ) : winner === 'maniac' ? (
      <ManiacIcon size={size} />
    ) : null;

  const roleColor = (role: NonNullable<(typeof room.players)[number]['revealedRole']>) =>
    ROLE_INFO[role].team === 'mafia'
      ? 'text-blood-400'
      : ROLE_INFO[role].team === 'maniac'
        ? 'text-violet-400'
        : 'text-brass-400';

  return (
    <main className="flex h-screen flex-col px-4 py-3">
      {/* The game screen stays visible underneath: nobody thinks they were kicked. */}
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display hidden text-lg font-bold text-white md:block">
            {room.settings.title}
          </h1>
          <span
            className="font-display flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold"
            style={{
              borderColor: accent,
              color: accent,
              background: 'color-mix(in srgb, currentColor 8%, transparent)',
            }}
          >
            {winnerIcon(15)}
            {WINNER_LABELS[winner]}
          </span>
          {!showOverlay && (
            <button className="btn-secondary" onClick={() => setShowOverlay(true)}>
              <EyeIcon size={15} /> Показать результаты
            </button>
          )}
        </div>
        <MediaBar roomId={roomId} onLeave={onLeave} />
      </header>

      <div className="min-h-0 flex-1">
        <VideoGrid />
      </div>

      {showOverlay && (
        <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="anim-fade-up flex w-full max-w-xl flex-col items-center gap-6">
            <div className="stagger flex flex-col items-center text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: accent,
                  color: accent,
                  boxShadow: `0 0 50px color-mix(in srgb, ${accent} 25%, transparent)`,
                }}
              >
                {winnerIcon(38) ?? <LogoMark size={42} />}
              </div>
              <div className="font-display mt-3 text-[10px] font-bold uppercase tracking-[0.35em] text-ink-400">
                Игра завершена
              </div>
              <h1 className="font-display mt-1 text-3xl font-black text-white sm:text-4xl">
                {WINNER_LABELS[winner]}
              </h1>
            </div>

            <div className="card w-full">
              <h2 className="font-display mb-3 text-xs font-bold uppercase tracking-[0.25em] text-brass-500">
                Игроки и роли
              </h2>
              <ul className="divide-y divide-ink-800">
                {room.players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {p.isHost && <CrownIcon size={13} className="shrink-0 text-brass-400" />}
                      <span className="truncate text-ink-200">
                        {p.nickname}
                        {p.id === selfId && <span className="text-ink-400"> · ты</span>}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-4">
                      <span className="flex items-center gap-1.5 text-ink-300">
                        {p.revealedRole && (
                          <RoleIcon
                            role={p.revealedRole}
                            size={14}
                            className={roleColor(p.revealedRole)}
                          />
                        )}
                        {p.revealedRole ? ROLE_INFO[p.revealedRole].title : '—'}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          p.isAlive
                            ? 'bg-verdant-500/15 text-verdant-400'
                            : p.deathType === 'eliminated'
                              ? 'bg-brass-600/15 text-brass-400'
                              : 'bg-blood-700/20 text-blood-400'
                        }`}
                      >
                        {p.isAlive ? 'Выжил' : p.deathType === 'eliminated' ? 'Выгнан' : 'Убит'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {isHost && (
                <button className="btn-primary" onClick={restart}>
                  <ReviveIcon size={16} /> Вернуться в лобби
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowOverlay(false)}>
                <EyeIcon size={16} /> Посмотреть на игроков
              </button>
              <button className="btn-ghost" onClick={onLeave}>
                <ExitIcon size={16} /> Выйти
              </button>
            </div>
            {error && <p className="text-sm text-blood-400">{error}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
