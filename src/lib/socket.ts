'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    getSocket()
      .timeout(10000)
      .emit(event, payload, (err: unknown, response: T | { error: string }) => {
        if (err) {
          reject(new Error('Сервер не отвечает'));
          return;
        }
        if (response && typeof response === 'object' && 'error' in response) {
          reject(new Error((response as { error: string }).error));
          return;
        }
        resolve(response as T);
      });
  });
}
