'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { emitWithAck, getSocket } from '@/lib/socket';
import { NICKNAME_KEY, playerIdStorageKey, useRoomStore } from '@/lib/store';
import { PeerManager } from '@/lib/webrtc';
import type { PlayerRole, RoomPublicState } from '@/shared/types';
import PreJoin from './PreJoin';
import Lobby from './Lobby';
import GameView from '../game/GameView';
import Results from '../game/Results';

type JoinResponse =
  | { playerId: string; room: RoomPublicState }
  | { pending: true; requestId: string };

export default function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [joined, setJoined] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const kicked = useRoomStore((s) => s.kicked);
  const connection = useRoomStore((s) => s.connection);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const joinedRef = useRef(false);

  const cleanupMedia = useCallback(() => {
    const { localStream, setLocalStream } = useRoomStore.getState();
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
  }, []);

  const completeJoin = useCallback(
    (res: { playerId: string; room: RoomPublicState }) => {
      const store = useRoomStore.getState();
      localStorage.setItem(playerIdStorageKey(roomId), res.playerId);
      store.setSelfId(res.playerId);
      store.setRoom(res.room);

      const socket = getSocket();
      peerManagerRef.current?.destroy();
      peerManagerRef.current = new PeerManager({
        socket,
        roomId,
        selfId: res.playerId,
        getLocalStream: () => useRoomStore.getState().localStream,
        onRemoteStream: (playerId, stream) =>
          useRoomStore.getState().setRemoteStream(playerId, stream),
        onPeerClosed: (playerId) => useRoomStore.getState().removeRemoteStream(playerId),
      });

      // Announce current media state to the room (only for tracks that exist).
      const { micEnabled, cameraEnabled, localStream } = useRoomStore.getState();
      socket.emit('webrtc:media-state-changed', {
        roomId,
        playerId: res.playerId,
        micEnabled: micEnabled && (localStream?.getAudioTracks().length ?? 0) > 0,
        cameraEnabled: cameraEnabled && (localStream?.getVideoTracks().length ?? 0) > 0,
      });

      joinedRef.current = true;
      setWaitingApproval(false);
      setJoined(true);
    },
    [roomId],
  );

  const join = useCallback(
    async (nickname: string) => {
      const storedPlayerId = localStorage.getItem(playerIdStorageKey(roomId)) ?? undefined;
      localStorage.setItem(NICKNAME_KEY, nickname);

      const res = await emitWithAck<JoinResponse>('room:join', {
        roomId,
        nickname,
        playerId: storedPlayerId,
      });

      if ('pending' in res) {
        // Закрытая комната: ждем одобрения хоста.
        setWaitingApproval(true);
        return;
      }
      completeJoin(res);
    },
    [roomId, completeJoin],
  );

  // Socket listeners.
  useEffect(() => {
    const socket = getSocket();
    const store = useRoomStore.getState;

    const onState = (state: RoomPublicState) => store().setRoom(state);
    const onRole = (role: PlayerRole) => store().setRole(role);
    const onAllRoles = (roles: PlayerRole[]) => store().setAllRoles(roles);
    const onKicked = () => {
      // playerId намеренно остается в localStorage: по нему работает бан.
      store().setKicked(true);
    };
    const onJoinApproved = (res: { playerId: string; room: RoomPublicState }) => {
      completeJoin(res);
    };
    const onJoinDeclined = () => {
      setWaitingApproval(false);
      setFatalError('Хост отклонил твой запрос на вход');
    };
    const onMediaForced = ({ mic, camera }: { mic: boolean; camera: boolean }) => {
      const { localStream, micEnabled, cameraEnabled, setMediaEnabled } = store();
      if (mic) localStream?.getAudioTracks().forEach((t) => (t.enabled = false));
      if (camera) localStream?.getVideoTracks().forEach((t) => (t.enabled = false));
      setMediaEnabled(mic ? false : micEnabled, camera ? false : cameraEnabled);
    };
    const onDisconnect = () => store().setConnection('reconnecting');
    const onConnect = () => {
      store().setConnection('connected');
      // Reclaim the session after a reconnect.
      if (joinedRef.current) {
        const nickname = localStorage.getItem(NICKNAME_KEY) ?? 'Игрок';
        join(nickname).catch(() => {
          joinedRef.current = false;
          setJoined(false);
        });
      }
    };

    socket.on('room:state', onState);
    socket.on('game:role', onRole);
    socket.on('game:all-roles', onAllRoles);
    socket.on('room:kicked', onKicked);
    socket.on('room:join-approved', onJoinApproved);
    socket.on('room:join-declined', onJoinDeclined);
    socket.on('media:forced', onMediaForced);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);

    return () => {
      socket.off('room:state', onState);
      socket.off('game:role', onRole);
      socket.off('game:all-roles', onAllRoles);
      socket.off('room:kicked', onKicked);
      socket.off('room:join-approved', onJoinApproved);
      socket.off('room:join-declined', onJoinDeclined);
      socket.off('media:forced', onMediaForced);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
    };
  }, [roomId, join, completeJoin]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      peerManagerRef.current?.destroy();
      peerManagerRef.current = null;
      cleanupMedia();
      useRoomStore.getState().reset();
    };
  }, [cleanupMedia]);

  // If host was transferred away from us, drop the all-roles list.
  const allRoles = useRoomStore((s) => s.allRoles);
  useEffect(() => {
    if (room && selfId && room.hostPlayerId !== selfId && allRoles) {
      useRoomStore.getState().setAllRoles(null);
    }
  }, [room, selfId, allRoles]);

  // Fallback role fetch: if the game is running but we never received our
  // role (missed push during reconnect), ask the server directly.
  const role = useRoomStore((s) => s.role);
  useEffect(() => {
    if (!joined || !room || room.status !== 'in_progress' || role) return;
    let cancelled = false;
    const fetchRole = async () => {
      try {
        const res = await emitWithAck<{
          role: PlayerRole | null;
          allRoles?: PlayerRole[];
        }>('game:get-role', { roomId });
        if (cancelled) return;
        const store = useRoomStore.getState();
        if (res.role) store.setRole(res.role);
        if (res.allRoles) store.setAllRoles(res.allRoles);
      } catch {
        /* retried by the effect on next state change */
      }
    };
    const t = setTimeout(fetchRole, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [joined, room, role, roomId]);

  // Auto-mute self when dead and the room settings require it.
  const selfPlayer = room?.players.find((p) => p.id === selfId);
  const micEnabled = useRoomStore((s) => s.micEnabled);
  useEffect(() => {
    if (!room || !selfPlayer || !selfId) return;
    if (!selfPlayer.isAlive && room.settings.autoMuteDead && micEnabled) {
      const { localStream, cameraEnabled, setMediaEnabled } = useRoomStore.getState();
      localStream?.getAudioTracks().forEach((t) => (t.enabled = false));
      setMediaEnabled(false, cameraEnabled);
      getSocket().emit('webrtc:media-state-changed', {
        roomId,
        playerId: selfId,
        micEnabled: false,
        cameraEnabled,
      });
    }
  }, [room, selfPlayer, selfId, micEnabled, roomId]);

  const leave = useCallback(() => {
    if (selfId) {
      getSocket().emit('room:leave', { roomId, playerId: selfId });
      localStorage.removeItem(playerIdStorageKey(roomId));
    }
    peerManagerRef.current?.destroy();
    peerManagerRef.current = null;
    joinedRef.current = false;
    cleanupMedia();
    useRoomStore.getState().reset();
    router.push('/');
  }, [roomId, selfId, router, cleanupMedia]);

  if (kicked) {
    return (
      <CenterMessage title="Вас исключили из комнаты">
        <p className="text-sm text-ink-400">Войти в эту комнату снова нельзя.</p>
        <button className="btn-primary" onClick={() => router.push('/')}>
          На главную
        </button>
      </CenterMessage>
    );
  }

  if (waitingApproval) {
    return (
      <CenterMessage title="Ждем одобрения хоста…">
        <p className="max-w-sm text-center text-sm text-ink-400">
          Комната закрытая. Хост видит твой запрос и решает, впустить ли тебя.
        </p>
        <div className="anim-pulse-ring h-3 w-3 rounded-full bg-blood-500" />
        <button className="btn-ghost" onClick={() => router.push('/')}>
          Отменить
        </button>
      </CenterMessage>
    );
  }

  if (fatalError) {
    return (
      <CenterMessage title={fatalError}>
        <button className="btn-primary" onClick={() => router.push('/')}>
          На главную
        </button>
      </CenterMessage>
    );
  }

  if (!joined || !room || !selfId) {
    return <PreJoin roomId={roomId} onJoin={join} onFatalError={setFatalError} />;
  }

  return (
    <div className="min-h-screen">
      {connection === 'reconnecting' && (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-600 py-1 text-center text-sm font-medium text-black">
          Переподключение к серверу…
        </div>
      )}
      {room.status === 'lobby' && <Lobby roomId={roomId} onLeave={leave} />}
      {room.status === 'in_progress' && <GameView roomId={roomId} onLeave={leave} />}
      {room.status === 'finished' && <Results roomId={roomId} onLeave={leave} />}
    </div>
  );
}

function CenterMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="stagger flex min-h-screen flex-col items-center justify-center gap-5 px-4">
      <h1 className="font-display text-center text-2xl font-bold text-white">{title}</h1>
      {children}
    </div>
  );
}
