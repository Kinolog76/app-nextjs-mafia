'use client';

import { useState } from 'react';
import { emitWithAck } from '@/lib/socket';
import { useRoomStore } from '@/lib/store';
import { ROLE_INFO } from '@/shared/roles';
import type { GamePhase, TimerType, Winner } from '@/shared/types';
import {
  CameraOffIcon,
  CrownIcon,
  EyeIcon,
  EyeOffIcon,
  ManiacIcon,
  MicOffIcon,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  ReviveIcon,
  RoleIcon,
  SkullIcon,
  StopIcon,
  SunIcon,
  VoteIcon,
  XIcon,
} from '@/shared/ui/icons';

export default function HostPanel({ roomId }: { roomId: string }) {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const allRoles = useRoomStore((s) => s.allRoles);
  const [error, setError] = useState<string | null>(null);
  const [timerType, setTimerType] = useState<TimerType>('day');
  const [speechTarget, setSpeechTarget] = useState<string>('');
  const [showRoles, setShowRoles] = useState(false);

  if (!room || !selfId) return null;

  const call = async (event: string, payload: Record<string, unknown>) => {
    setError(null);
    try {
      await emitWithAck(event, { roomId, hostPlayerId: selfId, ...payload });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const setPhase = (phase: GamePhase) => call('game:phase-change', { phase });

  const timerDurations: Record<TimerType, number> = {
    role_reveal: room.settings.roleRevealSeconds,
    night: room.settings.nightSeconds,
    day: room.settings.dayDiscussionSeconds,
    speech: room.settings.playerSpeechSeconds,
    voting: room.settings.votingSeconds,
  };

  const startTimer = () =>
    call('timer:start', {
      type: timerType,
      durationSeconds: timerDurations[timerType],
      ...(timerType === 'speech' && speechTarget ? { targetPlayerId: speechTarget } : {}),
    });

  const timer = room.timer;
  const roleOf = (playerId: string) => allRoles?.find((r) => r.playerId === playerId)?.role;
  const roleColor = (role: import('@/shared/types').RoleName) =>
    ROLE_INFO[role].team === 'mafia'
      ? 'text-blood-400'
      : ROLE_INFO[role].team === 'maniac'
        ? 'text-violet-400'
        : 'text-brass-400';

  const sectionTitle = (text: string) => (
    <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-brass-500">
      {text}
    </h3>
  );

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2">
        {sectionTitle('Фаза игры')}
        <div className="grid grid-cols-2 gap-2">
          <button
            className={room.phase === 'night' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setPhase('night')}
          >
            <MoonIcon size={15} /> Ночь
          </button>
          <button
            className={room.phase === 'day' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setPhase('day')}
          >
            <SunIcon size={15} /> День
          </button>
          <button
            className={`col-span-2 ${room.phase === 'voting' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => call('vote:start', {})}
          >
            <VoteIcon size={15} /> Начать голосование
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {sectionTitle('Таймер')}
        <select
          className="input"
          value={timerType}
          onChange={(e) => setTimerType(e.target.value as TimerType)}
        >
          <option value="day">Обсуждение · {room.settings.dayDiscussionSeconds}с</option>
          <option value="speech">Речь игрока · {room.settings.playerSpeechSeconds}с</option>
          <option value="night">Ночь · {room.settings.nightSeconds}с</option>
          <option value="voting">Голосование · {room.settings.votingSeconds}с</option>
          <option value="role_reveal">Показ ролей · {room.settings.roleRevealSeconds}с</option>
        </select>
        {timerType === 'speech' && (
          <select
            className="input"
            value={speechTarget}
            onChange={(e) => setSpeechTarget(e.target.value)}
          >
            <option value="">— чья речь —</option>
            {room.players
              .filter((p) => p.isAlive)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
          </select>
        )}
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-secondary" onClick={startTimer} title="Запустить">
            <PlayIcon size={14} />
          </button>
          {timer?.status === 'paused' ? (
            <button
              className="btn-secondary"
              onClick={() => call('timer:resume', {})}
              title="Продолжить"
            >
              <PlayIcon size={14} className="text-brass-400" />
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => call('timer:pause', {})}
              disabled={timer?.status !== 'running'}
              title="Пауза"
            >
              <PauseIcon size={14} />
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => call('timer:reset', {})}
            disabled={!timer}
            title="Сброс"
          >
            <StopIcon size={14} />
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          {sectionTitle('Игроки')}
          <button
            className="flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-white"
            onClick={() => setShowRoles((v) => !v)}
          >
            {showRoles ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
            {showRoles ? 'Скрыть роли' : 'Роли'}
          </button>
        </div>
        <ul className="space-y-1">
          {room.players.map((p) => {
            const role = roleOf(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/50 px-2.5 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {showRoles && role && (
                    <RoleIcon role={role} size={13} className={roleColor(role)} />
                  )}
                  <span
                    className={`truncate ${p.isAlive ? 'text-ink-200' : 'text-ink-400 line-through'}`}
                  >
                    {p.nickname}
                  </span>
                  {showRoles && role && (
                    <span className="shrink-0 text-[10px] text-ink-400">
                      {ROLE_INFO[role].title}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 gap-1">
                  {p.id !== selfId && p.media.micEnabled && (
                    <button
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-blood-700/30 hover:text-blood-400"
                      onClick={() =>
                        call('room:force-media', { targetPlayerId: p.id, mic: true })
                      }
                      title="Выключить микрофон игроку"
                    >
                      <MicOffIcon size={14} />
                    </button>
                  )}
                  {p.id !== selfId && p.media.cameraEnabled && (
                    <button
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-blood-700/30 hover:text-blood-400"
                      onClick={() =>
                        call('room:force-media', { targetPlayerId: p.id, camera: true })
                      }
                      title="Выключить камеру игроку"
                    >
                      <CameraOffIcon size={14} />
                    </button>
                  )}
                  {p.isAlive ? (
                    <>
                      <button
                        className="rounded-md p-1 text-ink-400 transition-colors hover:bg-blood-700/30 hover:text-blood-400"
                        onClick={() => call('game:player-killed', { targetPlayerId: p.id })}
                        title="Убить (ночью)"
                      >
                        <SkullIcon size={14} />
                      </button>
                      <button
                        className="rounded-md p-1 text-ink-400 transition-colors hover:bg-blood-700/30 hover:text-blood-400"
                        onClick={() => call('game:player-eliminated', { targetPlayerId: p.id })}
                        title="Выгнать (по голосованию)"
                      >
                        <VoteIcon size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-verdant-500/20 hover:text-verdant-400"
                      onClick={() => call('game:player-revive', { targetPlayerId: p.id })}
                      title="Вернуть в игру"
                    >
                      <ReviveIcon size={14} />
                    </button>
                  )}
                  {p.id !== selfId && p.isOnline && (
                    <button
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-brass-600/20 hover:text-brass-400"
                      onClick={() => call('room:transfer-host', { targetPlayerId: p.id })}
                      title="Передать права ведущего"
                    >
                      <CrownIcon size={14} />
                    </button>
                  )}
                  {p.id !== selfId && (
                    <button
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-blood-700/30 hover:text-blood-400"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Кикнуть игрока ${p.nickname}? Он больше НЕ сможет войти в эту комнату.`,
                          )
                        ) {
                          return;
                        }
                        emitWithAck('room:kick-player', {
                          roomId,
                          hostPlayerId: selfId,
                          targetPlayerId: p.id,
                        }).catch(() => {});
                      }}
                      title="Кикнуть из комнаты"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        {sectionTitle('Завершение')}
        <div className="grid gap-2">
          <button
            className="btn-secondary"
            onClick={() => call('game:finish', { winner: 'civilians' satisfies Winner })}
          >
            <SunIcon size={15} className="text-brass-400" /> Победа мирных
          </button>
          <button
            className="btn-secondary"
            onClick={() => call('game:finish', { winner: 'mafia' satisfies Winner })}
          >
            <MoonIcon size={15} className="text-blood-400" /> Победа мафии
          </button>
          {room.settings.hasManiac && (
            <button
              className="btn-secondary"
              onClick={() => call('game:finish', { winner: 'maniac' satisfies Winner })}
            >
              <ManiacIcon size={15} className="text-violet-400" /> Победа маньяка
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={() => call('game:finish', { winner: 'none' satisfies Winner })}
          >
            Завершить без победителя
          </button>
        </div>
      </section>

      {error && <p className="text-blood-400">{error}</p>}
    </div>
  );
}
