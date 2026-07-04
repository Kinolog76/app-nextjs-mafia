export type RoleName = 'civilian' | 'mafia' | 'don' | 'commissioner' | 'doctor' | 'maniac';
export type Team = 'civilians' | 'mafia' | 'maniac';
export type Winner = 'civilians' | 'mafia' | 'maniac' | 'none';

export type GamePhase =
  | 'lobby'
  | 'role_reveal'
  | 'night'
  | 'day'
  | 'voting'
  | 'elimination_result'
  | 'finished';

export type RoomStatus = 'lobby' | 'in_progress' | 'finished';

export type RoomSettings = {
  title: string;
  minPlayers: number;
  maxPlayers: number;

  mafiaCount: number;
  hasDon: boolean;
  hasCommissioner: boolean;
  hasDoctor: boolean;
  hasManiac: boolean;

  anonymousMode: boolean;
  allowDeadToSpeak: boolean;
  revealDeadRole: boolean;
  autoMuteDead: boolean;
  dimDeadVideo: boolean;
  hideDeadVideo: boolean;

  allowSelfVote: boolean;
  allowVoteChange: boolean;

  roleRevealSeconds: number;
  nightSeconds: number;
  dayDiscussionSeconds: number;
  playerSpeechSeconds: number;
  votingSeconds: number;

  autoNextPhase: boolean;
};

export const DEFAULT_SETTINGS: RoomSettings = {
  title: 'Комната Мафии',
  minPlayers: 4,
  maxPlayers: 8,

  mafiaCount: 2,
  hasDon: false,
  hasCommissioner: true,
  hasDoctor: true,
  hasManiac: false,

  anonymousMode: false,
  allowDeadToSpeak: false,
  revealDeadRole: false,
  autoMuteDead: true,
  dimDeadVideo: true,
  hideDeadVideo: false,

  allowSelfVote: false,
  allowVoteChange: true,

  roleRevealSeconds: 15,
  nightSeconds: 60,
  dayDiscussionSeconds: 300,
  playerSpeechSeconds: 60,
  votingSeconds: 45,

  autoNextPhase: false,
};

export type TimerType = 'role_reveal' | 'night' | 'day' | 'speech' | 'voting';

export type GameTimer = {
  type: TimerType;
  status: 'idle' | 'running' | 'paused' | 'finished';
  durationSeconds: number;
  remainingSeconds: number;
  startedAt?: number;
  pausedAt?: number;
  targetPlayerId?: string;
};

export type PlayerRole = {
  playerId: string;
  role: RoleName;
  team: Team;
};

export type DeathType = 'killed' | 'eliminated';

export type PublicPlayer = {
  id: string;
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
  revealedRole?: RoleName;
};

export type Nomination = {
  targetPlayerId: string;
  byPlayerId: string;
};

export type PublicVoteState = {
  status: 'idle' | 'active' | 'finished';
  /** Кандидаты на вылет в порядке выставления. */
  nominations: Nomination[];
  /** Индекс кандидата, за которого голосуют сейчас. */
  currentIndex: number;
  votedPlayerIds: string[];
  /** Открытое голосование: кто за кого. */
  votes: Record<string, string>;
  tally?: Record<string, number>;
};

export type JoinRequest = {
  id: string;
  nickname: string;
};

export type RoomPublicState = {
  id: string;
  title: string;
  joinRequests: JoinRequest[];
  hostPlayerId: string;
  status: RoomStatus;
  phase: GamePhase;
  settings: RoomSettings;
  players: PublicPlayer[];
  timer: GameTimer | null;
  voteState: PublicVoteState;
  winner?: Winner;
  serverNow: number;
};

export type PrivateRoleInfo = {
  playerId: string;
  role: RoleName;
  team: Team;
};

export type Ack<T> = (response: T | { error: string }) => void;
