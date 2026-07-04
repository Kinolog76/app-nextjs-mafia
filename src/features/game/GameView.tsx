'use client';

import { useState } from 'react';
import { useRoomStore } from '@/lib/store';
import { PHASE_LABELS, ROLE_INFO } from '@/shared/roles';
import VideoGrid from '../video/VideoGrid';
import MediaBar from '../video/MediaBar';
import TimerDisplay from '../timer/TimerDisplay';
import RoleCard from './RoleCard';
import HostPanel from './HostPanel';
import VotePanel from '../voting/VotePanel';
import Drawer from '@/shared/ui/Drawer';
import { CrownIcon, MoonIcon, RoleIcon, SkullIcon, SunIcon, VoteIcon } from '@/shared/ui/icons';

function PhaseBadge({ phase }: { phase: string }) {
  const icon =
    phase === 'night' ? (
      <MoonIcon size={15} />
    ) : phase === 'day' ? (
      <SunIcon size={15} />
    ) : phase === 'voting' ? (
      <VoteIcon size={15} />
    ) : null;

  return (
    <span
      className={`font-display flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold ${
        phase === 'night'
          ? 'border-indigo-800 bg-indigo-950/70 text-indigo-300'
          : phase === 'day'
            ? 'border-brass-600/60 bg-brass-600/10 text-brass-400'
            : phase === 'voting'
              ? 'border-blood-700 bg-blood-700/15 text-blood-400'
              : 'border-ink-600 bg-ink-900 text-ink-200'
      }`}
    >
      {icon}
      {PHASE_LABELS[phase]}
    </span>
  );
}

export default function GameView({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const role = useRoomStore((s) => s.role);
  const roleAcknowledged = useRoomStore((s) => s.roleAcknowledged);
  const [showHostPanel, setShowHostPanel] = useState(false);

  if (!room || !selfId) return null;

  const isHost = room.hostPlayerId === selfId;
  const selfPlayer = room.players.find((p) => p.id === selfId);
  const isNight = room.phase === 'night';
  const showRoleCard = room.phase === 'role_reveal' && role && !roleAcknowledged;

  return (
    <main className="flex h-screen flex-col px-4 py-3">
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display hidden text-lg font-bold text-white md:block">
            {room.settings.title}
          </h1>
          <PhaseBadge phase={room.phase} />
          <TimerDisplay />
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <button className="btn-primary" onClick={() => setShowHostPanel(true)}>
              <CrownIcon size={15} />
              <span className="hidden sm:inline">Ведущий</span>
            </button>
          )}
          {role && (
            <span
              className="flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white"
              title="Твоя роль. Видна только тебе"
            >
              <RoleIcon
                role={role.role}
                size={15}
                className={
                  role.team === 'mafia'
                    ? 'text-blood-400'
                    : role.team === 'maniac'
                      ? 'text-violet-400'
                      : 'text-brass-400'
                }
              />
              {ROLE_INFO[role.role].title}
            </span>
          )}
          <MediaBar roomId={roomId} onLeave={onLeave} />
        </div>
      </header>

      {selfPlayer && !selfPlayer.isAlive && (
        <div className="anim-fade-up mb-3 flex shrink-0 items-center gap-3 rounded-xl border border-blood-700/60 bg-blood-700/10 px-4 py-2.5 text-sm text-blood-400">
          <SkullIcon size={18} />
          <span>
            Ты выбыл из игры.{' '}
            {room.settings.allowDeadToSpeak
              ? 'Говорить можно, но голосовать нельзя.'
              : 'Говорить и голосовать нельзя — наблюдай.'}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="relative min-h-0 flex-1">
          {isNight && (
            <div className="night-veil anim-fade-in pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-2xl pt-4">
              <span className="font-display flex items-center gap-2 rounded-xl bg-indigo-950/80 px-4 py-2 text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">
                <MoonIcon size={16} /> Город засыпает
              </span>
            </div>
          )}
          <VideoGrid />
        </div>
        {(room.phase === 'day' || room.voteState.status !== 'idle') && (
          <div className="max-h-[45vh] shrink-0 overflow-y-auto">
            <VotePanel roomId={roomId} />
          </div>
        )}
      </div>

      {isHost && (
        <Drawer
          open={showHostPanel}
          onClose={() => setShowHostPanel(false)}
          title={
            <>
              <CrownIcon size={16} className="text-brass-400" />
              Панель ведущего
            </>
          }
        >
          <HostPanel roomId={roomId} />
        </Drawer>
      )}

      {showRoleCard && <RoleCard />}
    </main>
  );
}
