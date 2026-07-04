'use client';

import { useEffect, useRef, useState } from 'react';
import { NICKNAME_KEY, useRoomStore } from '@/lib/store';
import {
  CameraIcon,
  CameraOffIcon,
  CivilianIcon,
  LogoMark,
  MicIcon,
  MicOffIcon,
} from '@/shared/ui/icons';

type Props = {
  roomId: string;
  onJoin: (nickname: string) => Promise<void>;
  onFatalError: (message: string) => void;
};

export default function PreJoin({ roomId, onJoin, onFatalError }: Props) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const localStream = useRoomStore((s) => s.localStream);
  const setLocalStream = useRoomStore((s) => s.setLocalStream);
  const micEnabled = useRoomStore((s) => s.micEnabled);
  const cameraEnabled = useRoomStore((s) => s.cameraEnabled);
  const setMediaEnabled = useRoomStore((s) => s.setMediaEnabled);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setNickname(localStorage.getItem(NICKNAME_KEY) ?? '');
  }, []);

  // Acquire camera + mic once.
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (localStream) return;
    let cancelled = false;

    const explain = (err: unknown): string => {
      const name = err instanceof DOMException ? err.name : '';
      switch (name) {
        case 'NotReadableError':
        case 'AbortError':
          return 'Камера занята другим приложением или вкладкой. Закрой другие вкладки/программы с камерой и нажми «Повторить».';
        case 'NotAllowedError':
        case 'SecurityError':
          return 'Доступ к камере запрещен. Разреши камеру в настройках сайта (иконка замка в адресной строке) и нажми «Повторить».';
        case 'NotFoundError':
        case 'OverconstrainedError':
          return 'Камера не найдена. Проверь, что она подключена.';
        default:
          return 'Камера недоступна — вход только с микрофоном.';
      }
    };

    const acquire = async () => {
      setMediaError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError(
          'Браузер не дает доступ к камере. Нужен HTTPS или localhost и современный браузер.',
        );
        setMediaEnabled(false, false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);
        setMediaEnabled(true, true);
      } catch (videoErr) {
        console.warn('getUserMedia video+audio failed:', videoErr);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setLocalStream(stream);
          setMediaEnabled(true, false);
          setMediaError(explain(videoErr));
        } catch (audioErr) {
          console.warn('getUserMedia audio failed:', audioErr);
          setMediaError(`${explain(videoErr)} Микрофон тоже недоступен. Можно войти без них.`);
          setMediaEnabled(false, false);
        }
      }
    };

    acquire();
    return () => {
      cancelled = true;
    };
  }, [localStream, setLocalStream, setMediaEnabled, retryKey]);

  const retryMedia = () => {
    const { localStream: current, setLocalStream: set } = useRoomStore.getState();
    current?.getTracks().forEach((t) => t.stop());
    set(null);
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraEnabled]);

  const toggleMic = () => {
    const next = !micEnabled;
    localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMediaEnabled(next, cameraEnabled);
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
    setMediaEnabled(micEnabled, next);
  };

  const handleJoin = async () => {
    const nick = nickname.trim();
    if (nick.length < 2 || nick.length > 20) {
      setError('Никнейм должен быть от 2 до 20 символов');
      return;
    }
    setError(null);
    setJoining(true);
    try {
      await onJoin(nick);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось войти в комнату';
      if (message === 'Комната не найдена') {
        onFatalError(message);
      } else {
        setError(message);
      }
      setJoining(false);
    }
  };

  const hasAudio = !!localStream && localStream.getAudioTracks().length > 0;
  const hasVideo = !!localStream && localStream.getVideoTracks().length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-7 px-4 py-10">
      <div className="stagger flex flex-col items-center text-center">
        <LogoMark size={52} />
        <h1 className="font-display mt-3 text-2xl font-bold text-white">Вход в комнату</h1>
        <p className="mt-1 text-sm text-ink-400">
          Проверь камеру и микрофон перед тем, как сесть за стол
        </p>
      </div>

      <div className="card anim-fade-up w-full space-y-5" style={{ animationDelay: '0.1s' }}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
          {hasVideo && cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-400">
              <CivilianIcon size={48} />
              <span className="text-xs">
                {hasVideo ? 'Камера выключена' : 'Камера недоступна'}
              </span>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
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
          </div>
        </div>

        {mediaError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-brass-600/40 bg-brass-600/10 px-3 py-2">
            <p className="text-xs text-brass-400">{mediaError}</p>
            <button className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs" onClick={retryMedia}>
              Повторить
            </button>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-400">
            Никнейм
          </label>
          <input
            className="input text-base"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="От 2 до 20 символов"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <button
          className="btn-primary w-full py-3.5 text-base"
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? 'Входим…' : 'Войти в комнату'}
        </button>

        {error && <p className="text-sm text-blood-400">{error}</p>}
      </div>

      <p className="font-display text-xs tracking-widest text-ink-400 uppercase">
        Комната · {roomId}
      </p>
    </main>
  );
}
