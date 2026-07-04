import { customAlphabet } from 'nanoid';
import {
  DEFAULT_SETTINGS,
  type DeathType,
  type GamePhase,
  type GameTimer,
  type PlayerRole,
  type PublicPlayer,
  type PublicVoteState,
  type RoomPublicState,
  type RoomSettings,
  type RoomStatus,
  type TimerType,
  type Winner,
} from '../../src/shared/types';
import { generateRoles, validateRoleSetup } from '../game/role.service';

const roomIdGen = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
const playerIdGen = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

export type ServerPlayer = {
  id: string;
  socketId: string;
  roomId: string;
  nickname: string;
  isHost: boolean;
  isAlive: boolean;
  isOnline: boolean;
  isReady: boolean;
  deathType?: DeathType;
  media: {
    micEnabled: boolean;
    cameraEnabled: boolean;
  };
  joinedAt: number;
  disconnectedAt?: number;
};

export type ServerRoom = {
  id: string;
  inviteCode: string;
  hostPlayerId: string;
  status: RoomStatus;
  phase: GamePhase;
  settings: RoomSettings;
  players: Map<string, ServerPlayer>;
  banned: Set<string>;
  joinRequests: Map<string, { id: string; nickname: string; socketId: string; requestedAt: number }>;
  roles: Map<string, PlayerRole>;
  nominations: Array<{ targetPlayerId: string; byPlayerId: string }>;
  currentCandidateIndex: number;
  votes: Map<string, string>;
  voteStatus: 'idle' | 'active' | 'finished';
  voteTally: Record<string, number> | null;
  timer: GameTimer | null;
  timerTimeout: NodeJS.Timeout | null;
  winner?: Winner;
  createdAt: number;
  updatedAt: number;
};

export class GameError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GameError(message);
}

export class RoomManager {
  private rooms = new Map<string, ServerRoom>();
  private socketIndex = new Map<string, { roomId: string; playerId: string }>();
  /** Sockets that are waiting for the host's join approval. */
  private requestIndex = new Map<string, { roomId: string; requestId: string }>();

  /** Set by the socket layer; called when a server-side timer expires. */
  onTimerFinished: (roomId: string) => void = () => {};

  getRoom(roomId: string): ServerRoom | undefined {
    return this.rooms.get(roomId);
  }

  requireRoom(roomId: string): ServerRoom {
    const room = this.rooms.get(roomId);
    assert(room, 'Комната не найдена');
    return room;
  }

  bySocket(socketId: string) {
    return this.socketIndex.get(socketId);
  }

  private requireHost(room: ServerRoom, playerId: string) {
    assert(room.hostPlayerId === playerId, 'Действие доступно только хосту');
  }

  private validateNickname(nickname: string): string {
    const trimmed = (nickname ?? '').trim();
    assert(trimmed.length >= 2 && trimmed.length <= 20, 'Никнейм должен быть от 2 до 20 символов');
    return trimmed;
  }

  createRoom(socketId: string, nickname: string, settings?: Partial<RoomSettings>) {
    const nick = this.validateNickname(nickname);
    const now = Date.now();
    const roomId = roomIdGen();
    const playerId = playerIdGen();

    const player: ServerPlayer = {
      id: playerId,
      socketId,
      roomId,
      nickname: nick,
      isHost: true,
      isAlive: true,
      isOnline: true,
      isReady: false,
      media: { micEnabled: false, cameraEnabled: false },
      joinedAt: now,
    };

    const room: ServerRoom = {
      id: roomId,
      inviteCode: roomId,
      hostPlayerId: playerId,
      status: 'lobby',
      phase: 'lobby',
      settings: { ...DEFAULT_SETTINGS, ...settings },
      players: new Map([[playerId, player]]),
      banned: new Set(),
      joinRequests: new Map(),
      roles: new Map(),
      nominations: [],
      currentCandidateIndex: 0,
      votes: new Map(),
      voteStatus: 'idle',
      voteTally: null,
      timer: null,
      timerTimeout: null,
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(roomId, room);
    this.socketIndex.set(socketId, { roomId, playerId });
    return { room, player };
  }

  /**
   * Комнаты закрытые: новый игрок создает запрос на вход, хост одобряет.
   * Переподключение существующего игрока проходит без апрува.
   */
  requestJoin(
    socketId: string,
    roomId: string,
    nickname: string,
    existingPlayerId?: string,
  ):
    | { type: 'reconnected'; room: ServerRoom; player: ServerPlayer }
    | { type: 'pending'; room: ServerRoom; requestId: string } {
    const room = this.requireRoom(roomId);

    if (existingPlayerId && room.banned.has(existingPlayerId)) {
      throw new GameError('Ты исключен из этой комнаты и не можешь войти снова');
    }

    // Reconnect by known playerId.
    if (existingPlayerId && room.players.has(existingPlayerId)) {
      const player = room.players.get(existingPlayerId)!;
      this.socketIndex.delete(player.socketId);
      player.socketId = socketId;
      player.isOnline = true;
      player.disconnectedAt = undefined;
      this.socketIndex.set(socketId, { roomId, playerId: player.id });
      room.updatedAt = Date.now();
      return { type: 'reconnected', room, player };
    }

    assert(room.status === 'lobby', 'Игра уже началась');
    assert(room.players.size < room.settings.maxPlayers, 'Комната заполнена');
    const nick = this.validateNickname(nickname);

    // Replace an older pending request from the same socket.
    const oldRef = this.requestIndex.get(socketId);
    if (oldRef) {
      this.rooms.get(oldRef.roomId)?.joinRequests.delete(oldRef.requestId);
    }

    const requestId = playerIdGen();
    room.joinRequests.set(requestId, {
      id: requestId,
      nickname: nick,
      socketId,
      requestedAt: Date.now(),
    });
    this.requestIndex.set(socketId, { roomId, requestId });
    room.updatedAt = Date.now();
    return { type: 'pending', room, requestId };
  }

  approveJoin(roomId: string, hostPlayerId: string, requestId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    const request = room.joinRequests.get(requestId);
    assert(request, 'Запрос не найден — игрок мог отключиться');
    assert(room.status === 'lobby', 'Игра уже началась');
    assert(room.players.size < room.settings.maxPlayers, 'Комната заполнена');

    room.joinRequests.delete(requestId);
    this.requestIndex.delete(request.socketId);

    const player: ServerPlayer = {
      id: playerIdGen(),
      socketId: request.socketId,
      roomId,
      nickname: request.nickname,
      isHost: false,
      isAlive: true,
      isOnline: true,
      isReady: false,
      media: { micEnabled: false, cameraEnabled: false },
      joinedAt: Date.now(),
    };
    room.players.set(player.id, player);
    this.socketIndex.set(request.socketId, { roomId, playerId: player.id });
    room.updatedAt = Date.now();
    return { room, player };
  }

  declineJoin(roomId: string, hostPlayerId: string, requestId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    const request = room.joinRequests.get(requestId);
    assert(request, 'Запрос не найден');
    room.joinRequests.delete(requestId);
    this.requestIndex.delete(request.socketId);
    room.updatedAt = Date.now();
    return { room, socketId: request.socketId };
  }

  leaveRoom(roomId: string, playerId: string) {
    const room = this.requireRoom(roomId);
    const player = room.players.get(playerId);
    if (!player) return { room, removed: false, roomDeleted: false };

    this.socketIndex.delete(player.socketId);
    room.players.delete(playerId);
    room.votes.delete(playerId);
    room.nominations = room.nominations.filter(
      (n) => n.targetPlayerId !== playerId && n.byPlayerId !== playerId,
    );

    if (room.players.size === 0) {
      this.destroyRoom(roomId);
      return { room, removed: true, roomDeleted: true };
    }

    // Transfer host if the host left.
    if (room.hostPlayerId === playerId) {
      const next = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostPlayerId = next.id;
      next.isHost = true;
    }

    room.updatedAt = Date.now();
    return { room, removed: true, roomDeleted: false };
  }

  handleDisconnect(socketId: string) {
    // A pending join request dies with its socket.
    const reqRef = this.requestIndex.get(socketId);
    if (reqRef) {
      this.requestIndex.delete(socketId);
      const reqRoom = this.rooms.get(reqRef.roomId);
      if (reqRoom) {
        reqRoom.joinRequests.delete(reqRef.requestId);
        reqRoom.updatedAt = Date.now();
        return { room: reqRoom, player: null };
      }
    }

    const ref = this.socketIndex.get(socketId);
    if (!ref) return null;
    this.socketIndex.delete(socketId);

    const room = this.rooms.get(ref.roomId);
    if (!room) return null;
    const player = room.players.get(ref.playerId);
    if (!player || player.socketId !== socketId) return null;

    player.isOnline = false;
    player.disconnectedAt = Date.now();
    room.updatedAt = Date.now();
    return { room, player };
  }

  private destroyRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.timerTimeout) clearTimeout(room.timerTimeout);
    this.rooms.delete(roomId);
  }

  updateSettings(roomId: string, playerId: string, patch: Partial<RoomSettings>) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, playerId);
    assert(room.status === 'lobby', 'Нельзя менять настройки после старта игры');
    room.settings = { ...room.settings, ...patch };
    // Жесткий потолок комнаты: 12 игроков (WebRTC mesh дальше не тянет).
    room.settings.maxPlayers = Math.min(12, Math.max(3, room.settings.maxPlayers));
    room.settings.minPlayers = Math.min(room.settings.minPlayers, room.settings.maxPlayers);
    room.updatedAt = Date.now();
    return room;
  }

  kickPlayer(roomId: string, hostPlayerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(targetPlayerId !== hostPlayerId, 'Хост не может кикнуть себя');
    const target = room.players.get(targetPlayerId);
    assert(target, 'Игрок не найден');
    // Кикнутый игрок больше не сможет войти в эту комнату.
    room.banned.add(targetPlayerId);
    const targetSocketId = target.socketId;
    this.socketIndex.delete(targetSocketId);
    room.players.delete(targetPlayerId);
    room.votes.delete(targetPlayerId);
    room.nominations = room.nominations.filter(
      (n) => n.targetPlayerId !== targetPlayerId && n.byPlayerId !== targetPlayerId,
    );
    room.updatedAt = Date.now();
    return { room, targetSocketId };
  }

  transferHost(roomId: string, hostPlayerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(targetPlayerId !== hostPlayerId, 'Ты уже хост');
    const target = room.players.get(targetPlayerId);
    assert(target, 'Игрок не найден');
    assert(target.isOnline, 'Нельзя передать хоста офлайн-игроку');
    const oldHost = room.players.get(hostPlayerId);
    if (oldHost) oldHost.isHost = false;
    target.isHost = true;
    room.hostPlayerId = targetPlayerId;
    room.updatedAt = Date.now();
    return { room, newHostSocketId: target.socketId };
  }

  setReady(roomId: string, playerId: string, isReady: boolean) {
    const room = this.requireRoom(roomId);
    const player = room.players.get(playerId);
    assert(player, 'Игрок не найден');
    player.isReady = isReady;
    room.updatedAt = Date.now();
    return room;
  }

  /** Host force-disables a player's mic and/or camera. Only turning OFF is allowed. */
  forceMediaOff(
    roomId: string,
    hostPlayerId: string,
    targetPlayerId: string,
    target: { mic?: boolean; camera?: boolean },
  ) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    const player = room.players.get(targetPlayerId);
    assert(player, 'Игрок не найден');
    if (target.mic) player.media.micEnabled = false;
    if (target.camera) player.media.cameraEnabled = false;
    room.updatedAt = Date.now();
    return { room, targetSocketId: player.socketId };
  }

  setMediaState(roomId: string, playerId: string, micEnabled: boolean, cameraEnabled: boolean) {
    const room = this.requireRoom(roomId);
    const player = room.players.get(playerId);
    assert(player, 'Игрок не найден');
    player.media = { micEnabled, cameraEnabled };
    room.updatedAt = Date.now();
    return room;
  }

  startGame(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(room.status === 'lobby', 'Игра уже началась');

    const playerIds = [...room.players.keys()];
    validateRoleSetup(playerIds.length, room.settings);

    room.roles = generateRoles(playerIds, room.settings);
    room.status = 'in_progress';
    room.phase = 'role_reveal';
    room.winner = undefined;
    for (const p of room.players.values()) {
      p.isAlive = true;
      p.deathType = undefined;
    }
    room.votes.clear();
    room.voteStatus = 'idle';
    room.voteTally = null;
    room.nominations = [];
    room.currentCandidateIndex = 0;
    room.updatedAt = Date.now();
    return room;
  }

  changePhase(roomId: string, hostPlayerId: string, phase: GamePhase) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(room.status === 'in_progress', 'Игра не запущена');
    room.phase = phase;
    this.stopTimerInternal(room);
    // Каждая новая фаза сбрасывает выставления и голоса.
    room.votes.clear();
    room.voteStatus = 'idle';
    room.voteTally = null;
    room.nominations = [];
    room.currentCandidateIndex = 0;
    room.updatedAt = Date.now();
    return room;
  }

  private setDead(room: ServerRoom, targetPlayerId: string, deathType: DeathType) {
    const target = room.players.get(targetPlayerId);
    assert(target, 'Игрок не найден');
    target.isAlive = false;
    target.deathType = deathType;
    if (room.settings.autoMuteDead) {
      target.media.micEnabled = false;
    }
    room.votes.delete(targetPlayerId);
    room.updatedAt = Date.now();
  }

  killPlayer(roomId: string, hostPlayerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    this.setDead(room, targetPlayerId, 'killed');
    return room;
  }

  eliminatePlayer(roomId: string, hostPlayerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    this.setDead(room, targetPlayerId, 'eliminated');
    room.phase = 'elimination_result';
    return room;
  }

  revivePlayer(roomId: string, hostPlayerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    const target = room.players.get(targetPlayerId);
    assert(target, 'Игрок не найден');
    target.isAlive = true;
    target.deathType = undefined;
    room.updatedAt = Date.now();
    return room;
  }

  finishGame(roomId: string, hostPlayerId: string, winner: Winner) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    room.status = 'finished';
    room.phase = 'finished';
    room.winner = winner;
    this.stopTimerInternal(room);
    room.voteStatus = 'idle';
    room.updatedAt = Date.now();
    return room;
  }

  restartToLobby(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    room.status = 'lobby';
    room.phase = 'lobby';
    room.winner = undefined;
    room.roles.clear();
    room.votes.clear();
    room.voteStatus = 'idle';
    room.voteTally = null;
    room.nominations = [];
    room.currentCandidateIndex = 0;
    this.stopTimerInternal(room);
    for (const p of room.players.values()) {
      p.isAlive = true;
      p.deathType = undefined;
      p.isReady = false;
    }
    room.updatedAt = Date.now();
    return room;
  }

  // ---------- Timers ----------

  private stopTimerInternal(room: ServerRoom) {
    if (room.timerTimeout) {
      clearTimeout(room.timerTimeout);
      room.timerTimeout = null;
    }
  }

  private scheduleTimerFinish(room: ServerRoom, ms: number) {
    this.stopTimerInternal(room);
    room.timerTimeout = setTimeout(() => {
      if (!room.timer || room.timer.status !== 'running') return;
      room.timer.status = 'finished';
      room.timer.remainingSeconds = 0;
      room.timerTimeout = null;
      room.updatedAt = Date.now();
      this.onTimerFinished(room.id);
    }, ms);
  }

  startTimer(
    roomId: string,
    hostPlayerId: string,
    type: TimerType,
    durationSeconds: number,
    targetPlayerId?: string,
  ) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(durationSeconds > 0 && durationSeconds <= 3600, 'Некорректная длительность таймера');

    room.timer = {
      type,
      status: 'running',
      durationSeconds,
      remainingSeconds: durationSeconds,
      startedAt: Date.now(),
      targetPlayerId,
    };
    this.scheduleTimerFinish(room, durationSeconds * 1000);
    room.updatedAt = Date.now();
    return room;
  }

  pauseTimer(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    const timer = room.timer;
    assert(timer && timer.status === 'running', 'Таймер не запущен');
    const elapsed = (Date.now() - (timer.startedAt ?? Date.now())) / 1000;
    timer.remainingSeconds = Math.max(0, timer.remainingSeconds - elapsed);
    timer.status = 'paused';
    timer.pausedAt = Date.now();
    this.stopTimerInternal(room);
    room.updatedAt = Date.now();
    return room;
  }

  resumeTimer(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    const timer = room.timer;
    assert(timer && timer.status === 'paused', 'Таймер не на паузе');
    timer.status = 'running';
    timer.startedAt = Date.now();
    timer.pausedAt = undefined;
    this.scheduleTimerFinish(room, timer.remainingSeconds * 1000);
    room.updatedAt = Date.now();
    return room;
  }

  resetTimer(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    this.stopTimerInternal(room);
    room.timer = null;
    room.updatedAt = Date.now();
    return room;
  }

  // ---------- Voting ----------
  // Реальный порядок: днем игроки выставляют кандидатов, затем голосование
  // идет по кандидатам в порядке выставления.

  private startVotingTimer(room: ServerRoom) {
    room.timer = {
      type: 'voting',
      status: 'running',
      durationSeconds: room.settings.votingSeconds,
      remainingSeconds: room.settings.votingSeconds,
      startedAt: Date.now(),
    };
    this.scheduleTimerFinish(room, room.settings.votingSeconds * 1000);
  }

  nominate(roomId: string, playerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    assert(room.status === 'in_progress', 'Игра не запущена');
    assert(room.voteStatus === 'idle', 'Голосование уже идет');
    const nominator = room.players.get(playerId);
    assert(nominator?.isAlive, 'Мертвые не выставляют на голосование');
    const target = room.players.get(targetPlayerId);
    assert(target?.isAlive, 'Кандидат должен быть живым');
    assert(
      !room.nominations.some((n) => n.byPlayerId === playerId),
      'Ты уже выставил игрока на голосование',
    );
    assert(
      !room.nominations.some((n) => n.targetPlayerId === targetPlayerId),
      'Этот игрок уже выставлен',
    );
    room.nominations.push({ targetPlayerId, byPlayerId: playerId });
    room.updatedAt = Date.now();
    return room;
  }

  removeNomination(roomId: string, hostPlayerId: string, targetPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(room.voteStatus === 'idle', 'Голосование уже идет');
    room.nominations = room.nominations.filter((n) => n.targetPlayerId !== targetPlayerId);
    room.updatedAt = Date.now();
    return room;
  }

  startVote(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(room.status === 'in_progress', 'Игра не запущена');
    assert(room.nominations.length > 0, 'Никто не выставлен на голосование');
    // Drop nominations that died since nomination.
    room.nominations = room.nominations.filter(
      (n) => room.players.get(n.targetPlayerId)?.isAlive,
    );
    assert(room.nominations.length > 0, 'Все кандидаты уже мертвы');
    room.votes.clear();
    room.voteStatus = 'active';
    room.voteTally = null;
    room.currentCandidateIndex = 0;
    room.phase = 'voting';
    this.startVotingTimer(room);
    room.updatedAt = Date.now();
    return room;
  }

  castVote(roomId: string, voterPlayerId: string) {
    const room = this.requireRoom(roomId);
    assert(room.voteStatus === 'active', 'Голосование не активно');
    const candidate = room.nominations[room.currentCandidateIndex];
    assert(candidate, 'Нет текущего кандидата');
    const voter = room.players.get(voterPlayerId);
    assert(voter, 'Игрок не найден');
    assert(voter.isAlive, 'Мертвые игроки не голосуют');
    assert(
      room.settings.allowSelfVote || candidate.targetPlayerId !== voterPlayerId,
      'Голосовать за себя запрещено настройками',
    );
    const previous = room.votes.get(voterPlayerId);
    assert(
      previous === undefined || room.settings.allowVoteChange,
      'Ты уже проголосовал, менять голос запрещено настройками',
    );
    assert(previous !== candidate.targetPlayerId, 'Ты уже проголосовал за этого кандидата');
    room.votes.set(voterPlayerId, candidate.targetPlayerId);
    room.updatedAt = Date.now();
    return room;
  }

  nextCandidate(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(room.voteStatus === 'active', 'Голосование не активно');
    assert(
      room.currentCandidateIndex < room.nominations.length - 1,
      'Это последний кандидат — завершай голосование',
    );
    room.currentCandidateIndex += 1;
    this.startVotingTimer(room);
    room.updatedAt = Date.now();
    return room;
  }

  finishVote(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    assert(room.voteStatus === 'active', 'Голосование не активно');

    const tally: Record<string, number> = {};
    for (const target of room.votes.values()) {
      if (target === null) continue;
      tally[target] = (tally[target] ?? 0) + 1;
    }
    room.voteTally = tally;
    room.voteStatus = 'finished';
    this.stopTimerInternal(room);
    if (room.timer && room.timer.status === 'running') {
      room.timer.status = 'finished';
      room.timer.remainingSeconds = 0;
    }
    room.updatedAt = Date.now();
    return room;
  }

  cancelVote(roomId: string, hostPlayerId: string) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, hostPlayerId);
    room.votes.clear();
    room.voteStatus = 'idle';
    room.voteTally = null;
    room.currentCandidateIndex = 0;
    room.nominations = [];
    room.updatedAt = Date.now();
    return room;
  }

  // ---------- Public state ----------

  toPublicState(room: ServerRoom): RoomPublicState {
    const gameFinished = room.status === 'finished';

    const players: PublicPlayer[] = [...room.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => {
        const roleEntry = room.roles.get(p.id);
        const revealRole =
          roleEntry && (gameFinished || (!p.isAlive && room.settings.revealDeadRole));
        return {
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          isAlive: p.isAlive,
          isOnline: p.isOnline,
          isReady: p.isReady,
          deathType: p.deathType,
          media: { ...p.media },
          ...(revealRole ? { revealedRole: roleEntry.role } : {}),
        };
      });

    let timer = room.timer;
    if (timer && timer.status === 'running' && timer.startedAt) {
      const elapsed = (Date.now() - timer.startedAt) / 1000;
      timer = { ...timer, remainingSeconds: Math.max(0, timer.remainingSeconds - elapsed), startedAt: Date.now() };
      // Note: remainingSeconds/startedAt normalized to "now" so clients tick from receipt.
    }

    const voteState: PublicVoteState = {
      status: room.voteStatus,
      nominations: [...room.nominations],
      currentIndex: room.currentCandidateIndex,
      votedPlayerIds: [...room.votes.keys()],
      // Открытое голосование: голоса видны всем сразу.
      votes: Object.fromEntries(room.votes),
      ...(room.voteStatus === 'finished' ? { tally: room.voteTally ?? {} } : {}),
    };

    return {
      id: room.id,
      title: room.settings.title,
      joinRequests: [...room.joinRequests.values()].map((r) => ({
        id: r.id,
        nickname: r.nickname,
      })),
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      phase: room.phase,
      settings: room.settings,
      players,
      timer,
      voteState,
      winner: room.winner,
      serverNow: Date.now(),
    };
  }
}

export const roomManager = new RoomManager();
