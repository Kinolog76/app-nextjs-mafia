'use client';

import { getSocket } from '@/lib/socket';
import { useRoomStore } from '@/lib/store';
import { CameraIcon, CameraOffIcon, ExitIcon, MicIcon, MicOffIcon } from '@/shared/ui/icons';

export default function MediaBar({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const localStream = useRoomStore((s) => s.localStream);
  const micEnabled = useRoomStore((s) => s.micEnabled);
  const cameraEnabled = useRoomStore((s) => s.cameraEnabled);
  const setMediaEnabled = useRoomStore((s) => s.setMediaEnabled);
  const selfId = useRoomStore((s) => s.selfId);

  const announce = (mic: boolean, camera: boolean) => {
    if (!selfId) return;
    getSocket().emit('webrtc:media-state-changed', {
      roomId,
      playerId: selfId,
      micEnabled: mic,
      cameraEnabled: camera,
    });
  };

  const toggleMic = () => {
    const next = !micEnabled;
    localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMediaEnabled(next, cameraEnabled);
    announce(next, cameraEnabled);
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
    setMediaEnabled(micEnabled, next);
    announce(micEnabled, next);
  };

  const hasAudio = !!localStream && localStream.getAudioTracks().length > 0;
  const hasVideo = !!localStream && localStream.getVideoTracks().length > 0;

  return (
    <div className="flex items-center gap-2">
      <button
        className={micEnabled ? 'btn-secondary' : 'btn-danger'}
        onClick={toggleMic}
        disabled={!hasAudio}
        title={micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
      >
        {micEnabled ? <MicIcon /> : <MicOffIcon />}
      </button>
      <button
        className={cameraEnabled ? 'btn-secondary' : 'btn-danger'}
        onClick={toggleCamera}
        disabled={!hasVideo}
        title={cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
      >
        {cameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
      </button>
      <button className="btn-ghost" onClick={onLeave} title="Выйти из комнаты">
        <ExitIcon />
        <span className="hidden sm:inline">Выйти</span>
      </button>
    </div>
  );
}
