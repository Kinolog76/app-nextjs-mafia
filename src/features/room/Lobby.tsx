'use client';

import { useState } from 'react';
import { emitWithAck, getSocket } from '@/lib/socket';
import { useRoomStore } from '@/lib/store';
import VideoGrid from '../video/VideoGrid';
import MediaBar from '../video/MediaBar';
import SettingsPanel from './SettingsPanel';
import Drawer from '@/shared/ui/Drawer';
import {
  CameraOffIcon,
  CheckIcon,
  CopyIcon,
  CrownIcon,
  GearIcon,
  MicOffIcon,
  PlayIcon,
  UsersIcon,
  XIcon,
} from '@/shared/ui/icons';

export default function Lobby({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  if (!room || !selfId) return null;

  const isHost = room.hostPlayerId === selfId;
  const selfPlayer = room.players.find((p) => p.id === selfId);
  const readyCount = room.players.filter((p) => p.isReady).length;
  const notAllReady = readyCount < room.players.length;

  const copyLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Скопируй ссылку вручную:', url);
    }
  };

  const toggleReady = () => {
    getSocket().emit('room:set-ready', {
      roomId,
      playerId: selfId,
      isReady: !selfPlayer?.isReady,
    });
  };

  const startGame = async () => {
    setStartError(null);
    try {
      await emitWithAck('game:start', { roomId, hostPlayerId: selfId });
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Не удалось начать игру');
    }
  };

  const kick = async (targetPlayerId: string) => {
    const nick = room.players.find((p) => p.id === targetPlayerId)?.nickname ?? 'Игрок';
    if (
      !window.confirm(
        `Кикнуть игрока ${nick}? Он больше НЕ сможет войти в эту комнату.`,
      )
    ) {
      return;
    }
    try {
      await emitWithAck('room:kick-player', { roomId, hostPlayerId: selfId, targetPlayerId });
    } catch {
      /* state sync will correct the UI */
    }
  };

  const answerJoinRequest = async (requestId: string, approve: boolean) => {
    try {
      await emitWithAck(approve ? 'room:approve-join' : 'room:decline-join', {
        roomId,
        hostPlayerId: selfId,
        requestId,
      });
    } catch {
      /* state sync will correct the UI */
    }
  };

  const transferHost = async (targetPlayerId: string) => {
    try {
      await emitWithAck('room:transfer-host', {
        roomId,
        hostPlayerId: selfId,
        targetPlayerId,
      });
    } catch {
      /* state sync will correct the UI */
    }
  };

  const forceMedia = async (targetPlayerId: string, target: { mic?: boolean; camera?: boolean }) => {
    try {
      await emitWithAck('room:force-media', {
        roomId,
        hostPlayerId: selfId,
        targetPlayerId,
        ...target,
      });
    } catch {
      /* state sync will correct the UI */
    }
  };

  return (
    <main className="flex h-screen flex-col px-4 py-4">
      <header className="anim-fade-up mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-brass-500">
            Лобби
          </div>
          <h1 className="font-display text-2xl font-bold text-white">{room.settings.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={copyLink}>
            {copied ? <CheckIcon size={16} className="text-verdant-400" /> : <CopyIcon size={16} />}
            {copied ? 'Скопировано' : 'Пригласить'}
          </button>
          <button
            className={selfPlayer?.isReady ? 'btn-secondary' : 'btn-primary'}
            onClick={toggleReady}
          >
            <CheckIcon size={16} />
            {selfPlayer?.isReady ? 'Не готов' : 'Я готов'}
          </button>
          {isHost && (
            <>
              <button className="btn-secondary" onClick={() => setShowSettings(true)}>
                <GearIcon size={16} />
                <span className="hidden md:inline">Настройки</span>
              </button>
              <button className="btn-primary" onClick={startGame}>
                <PlayIcon size={16} />
                Начать игру
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={() => setShowPanel(true)}>
            <UsersIcon size={16} />
            {room.players.length}/{room.settings.maxPlayers}
          </button>
          <MediaBar roomId={roomId} onLeave={onLeave} />
        </div>
      </header>

      {startError && (
        <p className="mb-3 shrink-0 rounded-xl border border-blood-700/60 bg-blood-700/10 px-4 py-2 text-sm text-blood-400">
          {startError}
        </p>
      )}

      {isHost && room.joinRequests.length > 0 && (
        <div className="anim-fade-up mb-3 shrink-0 space-y-1.5 rounded-xl border border-brass-600/50 bg-brass-600/10 px-4 py-2.5">
          {room.joinRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-brass-400">
                <b className="text-white">{r.nickname}</b> хочет войти в комнату
              </span>
              <span className="flex gap-2">
                <button
                  className="btn-primary !px-3 !py-1 text-xs"
                  onClick={() => answerJoinRequest(r.id, true)}
                >
                  <CheckIcon size={13} /> Впустить
                </button>
                <button
                  className="btn-secondary !px-3 !py-1 text-xs"
                  onClick={() => answerJoinRequest(r.id, false)}
                >
                  <XIcon size={13} /> Отклонить
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="anim-fade-up min-h-0 flex-1">
        <VideoGrid />
      </div>

      <Drawer
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={
          <>
            <UsersIcon size={16} className="text-ink-400" />
            Игроки · {room.players.length}/{room.settings.maxPlayers}
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <ul className="space-y-1">
            {room.players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-ink-800/50 px-2.5 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-display w-5 shrink-0 text-center text-xs text-ink-400">
                    {i + 1}
                  </span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      p.isOnline ? 'bg-verdant-400' : 'bg-ink-600'
                    }`}
                    title={p.isOnline ? 'Онлайн' : 'Офлайн'}
                  />
                  {p.isHost && <CrownIcon size={13} className="shrink-0 text-brass-400" />}
                  <span className="truncate text-ink-200">
                    {p.nickname}
                    {p.id === selfId && <span className="text-ink-400"> · ты</span>}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {p.isReady && (
                    <span className="rounded-md bg-verdant-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-verdant-400">
                      готов
                    </span>
                  )}
                  {!p.media.micEnabled && <MicOffIcon size={13} className="text-ink-400" />}
                  {!p.media.cameraEnabled && <CameraOffIcon size={13} className="text-ink-400" />}
                  {isHost && p.id !== selfId && p.media.micEnabled && (
                    <button
                      className="rounded p-0.5 text-ink-400 transition-colors hover:text-blood-400"
                      onClick={() => forceMedia(p.id, { mic: true })}
                      title="Выключить микрофон игроку"
                    >
                      <MicOffIcon size={13} />
                    </button>
                  )}
                  {isHost && p.id !== selfId && p.media.cameraEnabled && (
                    <button
                      className="rounded p-0.5 text-ink-400 transition-colors hover:text-blood-400"
                      onClick={() => forceMedia(p.id, { camera: true })}
                      title="Выключить камеру игроку"
                    >
                      <CameraOffIcon size={13} />
                    </button>
                  )}
                  {isHost && p.id !== selfId && p.isOnline && (
                    <button
                      className="rounded p-0.5 text-ink-400 transition-colors hover:text-brass-400"
                      onClick={() => transferHost(p.id)}
                      title="Передать права хоста"
                    >
                      <CrownIcon size={13} />
                    </button>
                  )}
                  {isHost && p.id !== selfId && (
                    <button
                      className="rounded p-0.5 text-ink-400 transition-colors hover:text-blood-400"
                      onClick={() => kick(p.id)}
                      title="Кикнуть игрока"
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {isHost && notAllReady && room.players.length > 1 && (
            <p className="text-xs text-brass-400">
              Готовы {readyCount} из {room.players.length}. Начать можно, но не все нажали «Готов».
            </p>
          )}

          {!isHost && (
            <p className="text-center text-xs text-ink-400">Ждем, когда хост начнет игру…</p>
          )}
        </div>
      </Drawer>

      {showSettings && <SettingsPanel roomId={roomId} onClose={() => setShowSettings(false)} />}
    </main>
  );
}
