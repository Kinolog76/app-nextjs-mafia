'use client';

import { create } from 'zustand';
import type { PlayerRole, RoomPublicState } from '@/shared/types';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

type RoomStore = {
  room: RoomPublicState | null;
  selfId: string | null;
  role: PlayerRole | null;
  allRoles: PlayerRole[] | null;
  roleAcknowledged: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  micEnabled: boolean;
  cameraEnabled: boolean;
  serverTimeOffset: number;
  connection: ConnectionStatus;
  kicked: boolean;

  setRoom: (room: RoomPublicState | null) => void;
  setSelfId: (id: string | null) => void;
  setRole: (role: PlayerRole | null) => void;
  setAllRoles: (roles: PlayerRole[] | null) => void;
  setRoleAcknowledged: (v: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (playerId: string, stream: MediaStream) => void;
  removeRemoteStream: (playerId: string) => void;
  setMediaEnabled: (mic: boolean, camera: boolean) => void;
  setConnection: (status: ConnectionStatus) => void;
  setKicked: (v: boolean) => void;
  reset: () => void;
};

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  selfId: null,
  role: null,
  allRoles: null,
  roleAcknowledged: false,
  localStream: null,
  remoteStreams: {},
  micEnabled: true,
  cameraEnabled: true,
  serverTimeOffset: 0,
  connection: 'connected',
  kicked: false,

  setRoom: (room) =>
    set((state) => ({
      room,
      serverTimeOffset: room ? room.serverNow - Date.now() : state.serverTimeOffset,
    })),
  setSelfId: (selfId) => set({ selfId }),
  setRole: (role) => set({ role, roleAcknowledged: false }),
  setAllRoles: (allRoles) => set({ allRoles }),
  setRoleAcknowledged: (roleAcknowledged) => set({ roleAcknowledged }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (playerId, stream) =>
    set((state) => ({ remoteStreams: { ...state.remoteStreams, [playerId]: stream } })),
  removeRemoteStream: (playerId) =>
    set((state) => {
      const next = { ...state.remoteStreams };
      delete next[playerId];
      return { remoteStreams: next };
    }),
  setMediaEnabled: (micEnabled, cameraEnabled) => set({ micEnabled, cameraEnabled }),
  setConnection: (connection) => set({ connection }),
  setKicked: (kicked) => set({ kicked }),
  reset: () =>
    set({
      room: null,
      selfId: null,
      role: null,
      allRoles: null,
      roleAcknowledged: false,
      remoteStreams: {},
      kicked: false,
    }),
}));

export function playerIdStorageKey(roomId: string) {
  return `mafia:playerId:${roomId}`;
}

export const NICKNAME_KEY = 'mafia:nickname';
