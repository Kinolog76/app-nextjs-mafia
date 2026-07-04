'use client';

import { useState } from 'react';
import { emitWithAck } from '@/lib/socket';
import { useRoomStore } from '@/lib/store';
import { CheckIcon, SkullIcon, VoteIcon, XIcon } from '@/shared/ui/icons';

export default function VotePanel({ roomId }: { roomId: string }) {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const [error, setError] = useState<string | null>(null);

  if (!room || !selfId) return null;
  const vote = room.voteState;
  const isDay = room.phase === 'day';
  if (vote.status === 'idle' && !isDay) return null;

  const isHost = room.hostPlayerId === selfId;
  const selfPlayer = room.players.find((p) => p.id === selfId);
  const selfAlive = !!selfPlayer?.isAlive;
  const aliveCount = room.players.filter((p) => p.isAlive).length;
  const nickOf = (id: string) => room.players.find((p) => p.id === id)?.nickname ?? '?';
  const numberOf = (id: string) => {
    const i = room.players.findIndex((p) => p.id === id);
    return i >= 0 ? i + 1 : '?';
  };

  const votesFor = (targetId: string) =>
    Object.values(vote.votes).filter((t) => t === targetId).length;

  const act = async (event: string, payload: Record<string, unknown>) => {
    setError(null);
    try {
      await emitWithAck(event, { roomId, ...payload });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  /* ---------- День: выставление кандидатов ---------- */

  if (vote.status === 'idle') {
    const myNomination = vote.nominations.find((n) => n.byPlayerId === selfId);
    const candidatesLeft = room.players.filter(
      (p) => p.isAlive && !vote.nominations.some((n) => n.targetPlayerId === p.id),
    );

    return (
      <div className="card anim-fade-up space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-sm font-bold text-white">
            <VoteIcon size={16} className="text-brass-400" />
            Выставление на голосование
          </h2>
          {isHost && vote.nominations.length > 0 && (
            <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => act('vote:start', { hostPlayerId: selfId })}>
              Начать голосование ({vote.nominations.length})
            </button>
          )}
        </div>

        {vote.nominations.length > 0 && (
          <ol className="space-y-1">
            {vote.nominations.map((n, i) => (
              <li
                key={n.targetPlayerId}
                className="flex items-center justify-between gap-2 rounded-lg bg-ink-800/60 px-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-display w-5 shrink-0 text-center text-xs text-brass-400">
                    {i + 1}
                  </span>
                  <span className="truncate text-ink-200">
                    №{numberOf(n.targetPlayerId)} {nickOf(n.targetPlayerId)}
                  </span>
                  <span className="shrink-0 text-xs text-ink-400">
                    выставил {nickOf(n.byPlayerId)}
                  </span>
                </span>
                {isHost && (
                  <button
                    className="shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:text-blood-400"
                    onClick={() =>
                      act('vote:remove-nomination', {
                        hostPlayerId: selfId,
                        targetPlayerId: n.targetPlayerId,
                      })
                    }
                    title="Снять с голосования"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {selfAlive && !myNomination ? (
          <div className="space-y-1.5">
            <p className="text-xs text-ink-400">Кого выставляешь на голосование? (один раз за день)</p>
            <div className="flex flex-wrap gap-1.5">
              {candidatesLeft
                .filter((p) => p.id !== selfId)
                .map((p) => (
                  <button
                    key={p.id}
                    className="btn-secondary !px-2.5 !py-1 text-xs"
                    onClick={() =>
                      act('vote:nominate', { playerId: selfId, targetPlayerId: p.id })
                    }
                  >
                    №{numberOf(p.id)} {p.nickname}
                  </button>
                ))}
            </div>
          </div>
        ) : selfAlive && myNomination ? (
          <p className="text-xs text-ink-400">
            Ты выставил игрока {nickOf(myNomination.targetPlayerId)}.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-ink-400">
            <SkullIcon size={13} className="text-blood-400" /> Мертвые не выставляют кандидатов.
          </p>
        )}

        {vote.nominations.length === 0 && !isHost && (
          <p className="text-xs text-ink-500">Пока никто не выставлен.</p>
        )}
        {error && <p className="text-sm text-blood-400">{error}</p>}
      </div>
    );
  }

  /* ---------- Голосование по кандидатам по очереди ---------- */

  if (vote.status === 'active') {
    const current = vote.nominations[vote.currentIndex];
    const myVote = vote.votes[selfId];
    const isLast = vote.currentIndex >= vote.nominations.length - 1;
    const canVoteCurrent =
      selfAlive &&
      (room.settings.allowSelfVote || current?.targetPlayerId !== selfId) &&
      (myVote === undefined || room.settings.allowVoteChange) &&
      myVote !== current?.targetPlayerId;

    return (
      <div className="card anim-fade-up space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-sm font-bold text-white">
            <VoteIcon size={16} className="text-blood-400" />
            Голосование · кандидат {vote.currentIndex + 1} из {vote.nominations.length}
          </h2>
          <span className="text-xs tabular-nums text-ink-400">
            проголосовали {vote.votedPlayerIds.length}/{aliveCount}
          </span>
        </div>

        <ol className="space-y-1.5">
          {vote.nominations.map((n, i) => {
            const isCurrent = i === vote.currentIndex;
            const isPast = i < vote.currentIndex;
            const count = votesFor(n.targetPlayerId);
            return (
              <li
                key={n.targetPlayerId}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? 'border-blood-500 bg-blood-700/10'
                    : isPast
                      ? 'border-ink-700 bg-ink-800/40 opacity-70'
                      : 'border-ink-800 bg-ink-900/40 opacity-50'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-display w-5 shrink-0 text-center text-xs text-ink-400">
                    {i + 1}
                  </span>
                  <span className="truncate font-medium text-white">
                    №{numberOf(n.targetPlayerId)} {nickOf(n.targetPlayerId)}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-md bg-blood-700/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blood-400">
                      сейчас
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-display tabular-nums text-white">{count}</span>
                  {isCurrent && myVote === n.targetPlayerId && (
                    <CheckIcon size={14} className="text-verdant-400" />
                  )}
                  {isCurrent && canVoteCurrent && (
                    <button
                      className="btn-primary !px-3 !py-1 text-xs"
                      onClick={() => act('vote:cast', { voterPlayerId: selfId })}
                    >
                      Голосую за кик
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {!selfAlive && (
          <p className="flex items-center gap-2 text-xs text-ink-400">
            <SkullIcon size={13} className="text-blood-400" /> Мертвые не голосуют.
          </p>
        )}
        {selfAlive && myVote !== undefined && (
          <p className="text-xs text-ink-400">
            Твой голос: за {nickOf(myVote)}.{' '}
            {room.settings.allowVoteChange
              ? 'Можно перекинуть голос на текущего кандидата.'
              : 'Голос менять нельзя.'}
          </p>
        )}

        {isHost && (
          <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
            {!isLast ? (
              <button
                className="btn-secondary"
                onClick={() => act('vote:next', { hostPlayerId: selfId })}
              >
                Следующий кандидат →
              </button>
            ) : null}
            <button className="btn-primary" onClick={() => act('vote:finish', { hostPlayerId: selfId })}>
              Завершить голосование
            </button>
            <button className="btn-ghost" onClick={() => act('vote:cancel', { hostPlayerId: selfId })}>
              <XIcon size={14} /> Отменить
            </button>
          </div>
        )}
        {error && <p className="text-sm text-blood-400">{error}</p>}
      </div>
    );
  }

  /* ---------- Результаты ---------- */

  const tally = vote.tally ?? {};
  const results = vote.nominations
    .map((n) => ({
      id: n.targetPlayerId,
      player: room.players.find((p) => p.id === n.targetPlayerId),
      count: tally[n.targetPlayerId] ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
  const maxVotes = results[0]?.count ?? 0;

  return (
    <div className="card anim-fade-up space-y-4">
      <h2 className="font-display flex items-center gap-2 text-sm font-bold text-white">
        <VoteIcon size={16} className="text-brass-400" />
        Результаты голосования
      </h2>
      {results.length === 0 || maxVotes === 0 ? (
        <p className="text-sm text-ink-400">Никто не получил голосов.</p>
      ) : (
        <ul className="space-y-2">
          {results.map(({ id, player, count }) => (
            <li key={id} className="flex items-center gap-3 text-sm">
              <span className="w-36 truncate text-ink-200">
                №{numberOf(id)} {player?.nickname ?? '?'}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    count === maxVotes && count > 0
                      ? 'bg-gradient-to-r from-blood-600 to-blood-500'
                      : 'bg-ink-600'
                  }`}
                  style={{ width: `${(count / Math.max(1, aliveCount)) * 100}%` }}
                />
              </div>
              <span className="font-display w-6 text-right text-sm tabular-nums text-white">
                {count}
              </span>
              {isHost && player?.isAlive && (
                <button
                  className="btn-danger !px-2.5 !py-1 text-xs"
                  onClick={() =>
                    act('game:player-eliminated', { hostPlayerId: selfId, targetPlayerId: id })
                  }
                >
                  Выгнать
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isHost && (
        <div className="border-t border-ink-700 pt-3.5">
          <button className="btn-ghost" onClick={() => act('vote:cancel', { hostPlayerId: selfId })}>
            Закрыть без изгнания
          </button>
        </div>
      )}
      {error && <p className="text-sm text-blood-400">{error}</p>}
    </div>
  );
}
