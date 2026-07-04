'use client';

import { useEffect, useRef } from 'react';
import type { PublicPlayer, RoomSettings } from '@/shared/types';
import { ROLE_INFO } from '@/shared/roles';
import {
  CameraOffIcon,
  CivilianIcon,
  CrownIcon,
  MicIcon,
  MicOffIcon,
  SkullIcon,
  WifiOffIcon,
} from '@/shared/ui/icons';

type Props = {
  player: PublicPlayer;
  number: number;
  stream: MediaStream | null;
  isSelf: boolean;
  settings: RoomSettings;
};

export default function VideoTile({ player, number, stream, isSelf, settings }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const dead = !player.isAlive;
  const hideVideo = dead && settings.hideDeadVideo;
  const dimVideo = dead && !settings.hideDeadVideo && settings.dimDeadVideo;
  const showVideo = stream && player.media.cameraEnabled && !hideVideo;

  return (
    <div
      className={`group relative h-full min-h-0 w-full overflow-hidden rounded-2xl border transition-colors ${
        dead
          ? 'border-blood-700/60'
          : isSelf
            ? 'border-ink-600'
            : 'border-ink-700'
      } bg-ink-900`}
    >
      {/* Video element stays mounted so remote audio keeps playing. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={`h-full w-full object-cover ${isSelf ? '-scale-x-100' : ''} ${
          showVideo ? '' : 'invisible absolute'
        } ${dimVideo ? 'opacity-25 grayscale' : ''}`}
      />
      {!showVideo && (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-400 ${
            dimVideo ? 'opacity-40' : ''
          }`}
        >
          {dead ? <SkullIcon size={36} /> : <CivilianIcon size={36} />}
          {!dead && !player.media.cameraEnabled && (
            <span className="flex items-center gap-1 text-[11px]">
              <CameraOffIcon size={12} /> камера выключена
            </span>
          )}
        </div>
      )}

      {dead && (
        <div className="anim-fade-in absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-1 text-center">
            <SkullIcon size={30} className="text-blood-400" />
            <div className="font-display text-xs font-bold uppercase tracking-[0.25em] text-blood-400">
              Мертв
            </div>
            {player.revealedRole && (
              <div className="text-xs text-ink-300">{ROLE_INFO[player.revealedRole].title}</div>
            )}
          </div>
        </div>
      )}

      {!player.isOnline && !dead && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-2 text-sm text-brass-400">
            <WifiOffIcon size={16} /> переподключается…
          </div>
        </div>
      )}

      <div
        className={`font-display absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-lg border px-1.5 text-sm font-bold tabular-nums ${
          dead
            ? 'border-blood-700/60 bg-black/60 text-blood-400'
            : 'border-ink-600 bg-black/60 text-white'
        }`}
        title={`Игрок ${number}`}
      >
        {number}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-6 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-white">
          {player.isHost && <CrownIcon size={13} className="shrink-0 text-brass-400" />}
          <span className="truncate">
            {player.nickname}
            {isSelf && <span className="text-ink-300"> · ты</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {player.media.micEnabled ? (
            <MicIcon size={14} className="text-ink-300" />
          ) : (
            <MicOffIcon size={14} className="text-blood-400" />
          )}
          {!player.media.cameraEnabled && <CameraOffIcon size={14} className="text-ink-400" />}
        </span>
      </div>
    </div>
  );
}
