'use client';

import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

type PeerManagerOptions = {
  socket: Socket;
  roomId: string;
  selfId: string;
  getLocalStream: () => MediaStream | null;
  onRemoteStream: (playerId: string, stream: MediaStream) => void;
  onPeerClosed: (playerId: string) => void;
};

/**
 * WebRTC mesh: one RTCPeerConnection per remote player.
 * Signaling goes through Socket.IO. Existing peers initiate offers
 * towards a newly joined peer (webrtc:peer-joined).
 */
export class PeerManager {
  private peers = new Map<string, RTCPeerConnection>();
  private opts: PeerManagerOptions;
  private listeners: Array<[string, (...args: any[]) => void]> = [];

  constructor(opts: PeerManagerOptions) {
    this.opts = opts;
    this.bindSocket();
  }

  private bindSocket() {
    const { socket } = this.opts;

    const on = (event: string, handler: (...args: any[]) => void) => {
      socket.on(event, handler);
      this.listeners.push([event, handler]);
    };

    on('webrtc:peer-joined', ({ playerId }: { playerId: string }) => {
      if (playerId === this.opts.selfId) return;
      this.initiateTo(playerId);
    });

    on('webrtc:peer-left', ({ playerId }: { playerId: string }) => {
      this.closePeer(playerId);
    });

    on(
      'webrtc:offer',
      async ({ fromPlayerId, offer }: { fromPlayerId: string; offer: RTCSessionDescriptionInit }) => {
        // Fresh connection per offer: the initiator side decides to renegotiate by re-offering.
        this.closePeer(fromPlayerId, true);
        const pc = this.createPeer(fromPlayerId);
        try {
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:answer', {
            roomId: this.opts.roomId,
            fromPlayerId: this.opts.selfId,
            toPlayerId: fromPlayerId,
            answer,
          });
        } catch (err) {
          console.error('webrtc offer handling failed', err);
        }
      },
    );

    on(
      'webrtc:answer',
      async ({ fromPlayerId, answer }: { fromPlayerId: string; answer: RTCSessionDescriptionInit }) => {
        const pc = this.peers.get(fromPlayerId);
        if (!pc) return;
        try {
          await pc.setRemoteDescription(answer);
        } catch (err) {
          console.error('webrtc answer handling failed', err);
        }
      },
    );

    on(
      'webrtc:ice-candidate',
      async ({ fromPlayerId, candidate }: { fromPlayerId: string; candidate: RTCIceCandidateInit }) => {
        const pc = this.peers.get(fromPlayerId);
        if (!pc) return;
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          // Candidates may arrive before the remote description; safe to ignore for MVP.
        }
      },
    );
  }

  private createPeer(playerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(playerId, pc);

    const localStream = this.opts.getLocalStream();
    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.opts.socket.emit('webrtc:ice-candidate', {
          roomId: this.opts.roomId,
          fromPlayerId: this.opts.selfId,
          toPlayerId: playerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        this.opts.onRemoteStream(playerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(playerId);
      }
    };

    return pc;
  }

  async initiateTo(playerId: string) {
    this.closePeer(playerId, true);
    const pc = this.createPeer(playerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.opts.socket.emit('webrtc:offer', {
        roomId: this.opts.roomId,
        fromPlayerId: this.opts.selfId,
        toPlayerId: playerId,
        offer,
      });
    } catch (err) {
      console.error('webrtc offer creation failed', err);
    }
  }

  /** Call after joining: connect to every peer already in the room. */
  connectToAll(playerIds: string[]) {
    for (const id of playerIds) {
      if (id !== this.opts.selfId && !this.peers.has(id)) {
        this.initiateTo(id);
      }
    }
  }

  closePeer(playerId: string, silent = false) {
    const pc = this.peers.get(playerId);
    if (!pc) return;
    this.peers.delete(playerId);
    try {
      pc.close();
    } catch {
      /* noop */
    }
    if (!silent) this.opts.onPeerClosed(playerId);
  }

  destroy() {
    for (const [event, handler] of this.listeners) {
      this.opts.socket.off(event, handler);
    }
    this.listeners = [];
    for (const playerId of [...this.peers.keys()]) {
      this.closePeer(playerId, true);
    }
  }
}
