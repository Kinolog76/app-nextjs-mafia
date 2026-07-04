'use client';

import { useRoomStore } from '@/lib/store';
import VideoTile from './VideoTile';

export default function VideoGrid() {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const localStream = useRoomStore((s) => s.localStream);
  const remoteStreams = useRoomStore((s) => s.remoteStreams);

  if (!room) return null;

  const count = room.players.length;
  // 4 → 2×2 (50%/50%), 6 → 2×3 (50%/33%), 7–8 → 4×2 (25%/50%), 9–12 → 4×3 (25%/33%).
  const cols = count <= 1 ? 1 : count <= 6 ? 2 : 4;
  const rows = Math.max(1, Math.ceil(count / cols));

  return (
    <div
      className="grid h-full w-full gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {room.players.map((player, index) => (
        <VideoTile
          key={player.id}
          player={player}
          number={index + 1}
          stream={player.id === selfId ? localStream : (remoteStreams[player.id] ?? null)}
          isSelf={player.id === selfId}
          settings={room.settings}
        />
      ))}
    </div>
  );
}
