import type { Server, Socket } from 'socket.io';
import type {
  GamePhase,
  RoomSettings,
  TimerType,
  Winner,
} from '../src/shared/types';
import { GameError, roomManager, type ServerRoom } from './rooms/room.manager';

type AckFn = (response: unknown) => void;

function safe(handler: (...args: any[]) => void) {
  return (...args: any[]) => {
    const maybeAck = args[args.length - 1];
    const ack: AckFn | null = typeof maybeAck === 'function' ? maybeAck : null;
    try {
      handler(...args);
    } catch (err) {
      const message = err instanceof GameError ? err.message : 'Внутренняя ошибка сервера';
      if (!(err instanceof GameError)) console.error(err);
      if (ack) ack({ error: message });
    }
  };
}

export function registerSocketHandlers(io: Server) {
  const sync = (room: ServerRoom) => {
    io.to(room.id).emit('room:state', roomManager.toPublicState(room));
  };

  roomManager.onTimerFinished = (roomId) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    io.to(roomId).emit('timer:finish', { type: room.timer?.type });
    sync(room);
  };

  const sendPrivateRoles = (room: ServerRoom) => {
    for (const player of room.players.values()) {
      const role = room.roles.get(player.id);
      if (role) {
        io.to(player.socketId).emit('game:role', role);
      }
    }
    // Host leads the game manually and needs to see all roles.
    const host = room.players.get(room.hostPlayerId);
    if (host) {
      io.to(host.socketId).emit('game:all-roles', [...room.roles.values()]);
    }
  };

  io.on('connection', (socket: Socket) => {
    // ---------- Room ----------

    socket.on(
      'room:create',
      safe((payload: { nickname: string; settings?: Partial<RoomSettings> }, ack: AckFn) => {
        const { room, player } = roomManager.createRoom(socket.id, payload.nickname, payload.settings);
        socket.join(room.id);
        ack({
          roomId: room.id,
          inviteCode: room.inviteCode,
          playerId: player.id,
          room: roomManager.toPublicState(room),
        });
      }),
    );

    socket.on(
      'room:join',
      safe((payload: { roomId: string; nickname: string; playerId?: string }, ack: AckFn) => {
        const result = roomManager.requestJoin(
          socket.id,
          payload.roomId,
          payload.nickname,
          payload.playerId,
        );

        if (result.type === 'pending') {
          // Закрытая комната: ждем одобрения хоста.
          ack({ pending: true, requestId: result.requestId });
          sync(result.room);
          return;
        }

        const { room, player } = result;
        socket.join(room.id);
        ack({ playerId: player.id, room: roomManager.toPublicState(room) });
        // Existing peers (re)initiate WebRTC offers towards this player.
        socket.to(room.id).emit('webrtc:peer-joined', { playerId: player.id });
        if (room.status === 'in_progress') {
          const role = room.roles.get(player.id);
          if (role) socket.emit('game:role', role);
          if (player.id === room.hostPlayerId) {
            socket.emit('game:all-roles', [...room.roles.values()]);
          }
        }
        sync(room);
      }),
    );

    socket.on(
      'room:approve-join',
      safe((payload: { roomId: string; hostPlayerId: string; requestId: string }, ack: AckFn) => {
        const { room, player } = roomManager.approveJoin(
          payload.roomId,
          payload.hostPlayerId,
          payload.requestId,
        );
        const joinerSocket = io.sockets.sockets.get(player.socketId);
        if (joinerSocket) {
          joinerSocket.join(room.id);
          joinerSocket.emit('room:join-approved', {
            playerId: player.id,
            room: roomManager.toPublicState(room),
          });
          joinerSocket.to(room.id).emit('webrtc:peer-joined', { playerId: player.id });
        }
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'room:decline-join',
      safe((payload: { roomId: string; hostPlayerId: string; requestId: string }, ack: AckFn) => {
        const { room, socketId } = roomManager.declineJoin(
          payload.roomId,
          payload.hostPlayerId,
          payload.requestId,
        );
        io.to(socketId).emit('room:join-declined');
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'room:leave',
      safe((payload: { roomId: string; playerId: string }) => {
        const { room, roomDeleted } = roomManager.leaveRoom(payload.roomId, payload.playerId);
        socket.leave(payload.roomId);
        if (!roomDeleted) {
          io.to(room.id).emit('webrtc:peer-left', { playerId: payload.playerId });
          sync(room);
        }
      }),
    );

    socket.on(
      'room:update-settings',
      safe((payload: { roomId: string; playerId: string; settings: Partial<RoomSettings> }, ack: AckFn) => {
        const room = roomManager.updateSettings(payload.roomId, payload.playerId, payload.settings);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'room:kick-player',
      safe((payload: { roomId: string; hostPlayerId: string; targetPlayerId: string }, ack: AckFn) => {
        const { room, targetSocketId } = roomManager.kickPlayer(
          payload.roomId,
          payload.hostPlayerId,
          payload.targetPlayerId,
        );
        io.to(targetSocketId).emit('room:kicked');
        io.sockets.sockets.get(targetSocketId)?.leave(room.id);
        io.to(room.id).emit('webrtc:peer-left', { playerId: payload.targetPlayerId });
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'room:transfer-host',
      safe((payload: { roomId: string; hostPlayerId: string; targetPlayerId: string }, ack: AckFn) => {
        const { room, newHostSocketId } = roomManager.transferHost(
          payload.roomId,
          payload.hostPlayerId,
          payload.targetPlayerId,
        );
        // The new host leads the game manually and needs to see all roles.
        if (room.status === 'in_progress') {
          io.to(newHostSocketId).emit('game:all-roles', [...room.roles.values()]);
        }
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'room:force-media',
      safe(
        (
          payload: {
            roomId: string;
            hostPlayerId: string;
            targetPlayerId: string;
            mic?: boolean;
            camera?: boolean;
          },
          ack: AckFn,
        ) => {
          const { room, targetSocketId } = roomManager.forceMediaOff(
            payload.roomId,
            payload.hostPlayerId,
            payload.targetPlayerId,
            { mic: payload.mic, camera: payload.camera },
          );
          // Tell the target's client to actually disable its local tracks.
          io.to(targetSocketId).emit('media:forced', {
            mic: !!payload.mic,
            camera: !!payload.camera,
          });
          ack({ ok: true });
          sync(room);
        },
      ),
    );

    socket.on(
      'room:set-ready',
      safe((payload: { roomId: string; playerId: string; isReady: boolean }) => {
        const room = roomManager.setReady(payload.roomId, payload.playerId, payload.isReady);
        sync(room);
      }),
    );

    // ---------- Game ----------

    socket.on(
      'game:start',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.startGame(payload.roomId, payload.hostPlayerId);
        sendPrivateRoles(room);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'game:phase-change',
      safe((payload: { roomId: string; hostPlayerId: string; phase: GamePhase }, ack: AckFn) => {
        const room = roomManager.changePhase(payload.roomId, payload.hostPlayerId, payload.phase);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'game:player-killed',
      safe((payload: { roomId: string; hostPlayerId: string; targetPlayerId: string }, ack: AckFn) => {
        const room = roomManager.killPlayer(payload.roomId, payload.hostPlayerId, payload.targetPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'game:player-eliminated',
      safe((payload: { roomId: string; hostPlayerId: string; targetPlayerId: string }, ack: AckFn) => {
        const room = roomManager.eliminatePlayer(payload.roomId, payload.hostPlayerId, payload.targetPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'game:player-revive',
      safe((payload: { roomId: string; hostPlayerId: string; targetPlayerId: string }, ack: AckFn) => {
        const room = roomManager.revivePlayer(payload.roomId, payload.hostPlayerId, payload.targetPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'game:finish',
      safe((payload: { roomId: string; hostPlayerId: string; winner: Winner }, ack: AckFn) => {
        const room = roomManager.finishGame(payload.roomId, payload.hostPlayerId, payload.winner);
        ack({ ok: true });
        sync(room);
      }),
    );

    // Reliable role delivery: the client polls for its role if the pushed
    // 'game:role' event was missed (e.g. reconnect race at game start).
    socket.on(
      'game:get-role',
      safe((payload: { roomId: string }, ack: AckFn) => {
        const ref = roomManager.bySocket(socket.id);
        if (!ref || ref.roomId !== payload.roomId) throw new GameError('Игрок не найден');
        const room = roomManager.requireRoom(payload.roomId);
        const role = room.roles.get(ref.playerId) ?? null;
        const allRoles =
          ref.playerId === room.hostPlayerId ? [...room.roles.values()] : undefined;
        ack({ role, allRoles });
      }),
    );

    socket.on(
      'game:restart',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.restartToLobby(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    // ---------- Timer ----------

    socket.on(
      'timer:start',
      safe(
        (
          payload: {
            roomId: string;
            hostPlayerId: string;
            type: TimerType;
            durationSeconds: number;
            targetPlayerId?: string;
          },
          ack: AckFn,
        ) => {
          const room = roomManager.startTimer(
            payload.roomId,
            payload.hostPlayerId,
            payload.type,
            payload.durationSeconds,
            payload.targetPlayerId,
          );
          ack({ ok: true });
          sync(room);
        },
      ),
    );

    socket.on(
      'timer:pause',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.pauseTimer(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'timer:resume',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.resumeTimer(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'timer:reset',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.resetTimer(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    // ---------- Voting ----------

    socket.on(
      'vote:start',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.startVote(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'vote:nominate',
      safe((payload: { roomId: string; playerId: string; targetPlayerId: string }, ack: AckFn) => {
        const ref = roomManager.bySocket(socket.id);
        if (!ref || ref.playerId !== payload.playerId) {
          throw new GameError('Нельзя выставлять от имени другого игрока');
        }
        const room = roomManager.nominate(payload.roomId, payload.playerId, payload.targetPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'vote:remove-nomination',
      safe((payload: { roomId: string; hostPlayerId: string; targetPlayerId: string }, ack: AckFn) => {
        const room = roomManager.removeNomination(
          payload.roomId,
          payload.hostPlayerId,
          payload.targetPlayerId,
        );
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'vote:cast',
      safe((payload: { roomId: string; voterPlayerId: string }, ack: AckFn) => {
        // Anti-spoofing: the socket must own the voter player.
        const ref = roomManager.bySocket(socket.id);
        if (!ref || ref.playerId !== payload.voterPlayerId) {
          throw new GameError('Нельзя голосовать за другого игрока');
        }
        const room = roomManager.castVote(payload.roomId, payload.voterPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'vote:next',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.nextCandidate(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'vote:finish',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.finishVote(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    socket.on(
      'vote:cancel',
      safe((payload: { roomId: string; hostPlayerId: string }, ack: AckFn) => {
        const room = roomManager.cancelVote(payload.roomId, payload.hostPlayerId);
        ack({ ok: true });
        sync(room);
      }),
    );

    // ---------- WebRTC signaling ----------

    const relayToPlayer = (roomId: string, toPlayerId: string, event: string, data: unknown) => {
      const room = roomManager.getRoom(roomId);
      const target = room?.players.get(toPlayerId);
      if (target) io.to(target.socketId).emit(event, data);
    };

    socket.on(
      'webrtc:offer',
      safe((payload: { roomId: string; fromPlayerId: string; toPlayerId: string; offer: unknown }) => {
        relayToPlayer(payload.roomId, payload.toPlayerId, 'webrtc:offer', payload);
      }),
    );

    socket.on(
      'webrtc:answer',
      safe((payload: { roomId: string; fromPlayerId: string; toPlayerId: string; answer: unknown }) => {
        relayToPlayer(payload.roomId, payload.toPlayerId, 'webrtc:answer', payload);
      }),
    );

    socket.on(
      'webrtc:ice-candidate',
      safe((payload: { roomId: string; fromPlayerId: string; toPlayerId: string; candidate: unknown }) => {
        relayToPlayer(payload.roomId, payload.toPlayerId, 'webrtc:ice-candidate', payload);
      }),
    );

    socket.on(
      'webrtc:media-state-changed',
      safe((payload: { roomId: string; playerId: string; micEnabled: boolean; cameraEnabled: boolean }) => {
        const ref = roomManager.bySocket(socket.id);
        if (!ref || ref.playerId !== payload.playerId) return;
        const room = roomManager.setMediaState(
          payload.roomId,
          payload.playerId,
          payload.micEnabled,
          payload.cameraEnabled,
        );
        sync(room);
      }),
    );

    // ---------- Disconnect ----------

    socket.on('disconnect', () => {
      const result = roomManager.handleDisconnect(socket.id);
      if (result) {
        if (result.player) {
          io.to(result.room.id).emit('webrtc:peer-left', { playerId: result.player.id });
        }
        sync(result.room);
      }
    });
  });
}
