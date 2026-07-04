'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { emitWithAck } from '@/lib/socket';
import { NICKNAME_KEY, playerIdStorageKey } from '@/lib/store';
import type { RoomPublicState } from '@/shared/types';
import { LogoMark, FedoraIcon, DetectiveIcon, DoctorCrossIcon, CivilianIcon } from '@/shared/ui/icons';

type CreateResponse = {
  roomId: string;
  inviteCode: string;
  playerId: string;
  room: RoomPublicState;
};

const STEPS = [
  'Создай комнату и скопируй ссылку',
  'Друзья заходят без регистрации',
  'Настрой роли и таймеры, начни игру',
  'Каждый видит только свою роль',
  'Хост ведет: ночь, день, голосование',
];

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setNickname(localStorage.getItem(NICKNAME_KEY) ?? '');
  }, []);

  const createRoom = async () => {
    const nick = nickname.trim();
    if (nick.length < 2 || nick.length > 20) {
      setError('Никнейм должен быть от 2 до 20 символов');
      return;
    }
    setError(null);
    setCreating(true);
    try {
      localStorage.setItem(NICKNAME_KEY, nick);
      const res = await emitWithAck<CreateResponse>('room:create', { nickname: nick });
      localStorage.setItem(playerIdStorageKey(res.roomId), res.playerId);
      router.push(`/room/${res.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать комнату');
      setCreating(false);
    }
  };

  const joinByCode = () => {
    const trimmed = code.trim().replace(/^.*\/room\//, '');
    if (!trimmed) return;
    router.push(`/room/${trimmed}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-4 py-14">
      <div className="stagger flex flex-col items-center text-center">
        <LogoMark size={72} />
        <h1 className="font-display mt-5 text-5xl font-black tracking-tight text-white sm:text-6xl">
          MAFIA <span className="text-blood-500">ROOMS</span>
        </h1>
        <p className="mt-4 max-w-xl text-balance text-ink-300">
          Онлайн-комнаты для игры в Мафию с видео и голосом. Роли, ночь и день,
          таймеры, голосование — без регистрации и установки.
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="card anim-fade-up space-y-5" style={{ animationDelay: '0.15s' }}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-400">
              Твой никнейм
            </label>
            <input
              className="input text-base"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Дон Корлеоне"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            />
          </div>

          <button className="btn-primary w-full py-3.5 text-base" onClick={createRoom} disabled={creating}>
            {creating ? 'Создаем…' : 'Создать комнату'}
          </button>

          <div className="deco-divider text-xs">◆</div>

          <div className="flex gap-2">
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Код комнаты или ссылка"
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
            />
            <button className="btn-secondary shrink-0" onClick={joinByCode}>
              Войти
            </button>
          </div>

          {error && <p className="text-sm text-blood-400">{error}</p>}
        </div>

        <div className="card anim-fade-up" style={{ animationDelay: '0.25s' }}>
          <h2 className="font-display mb-4 text-sm font-bold uppercase tracking-widest text-brass-500">
            Как играть
          </h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-300">
                <span className="font-display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-600 text-xs text-brass-400">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3">
            <div className="flex items-center gap-3 text-ink-400">
              <FedoraIcon size={20} className="text-blood-400" />
              <DetectiveIcon size={20} className="text-brass-400" />
              <DoctorCrossIcon size={20} className="text-verdant-400" />
              <CivilianIcon size={20} />
            </div>
            <span className="text-xs text-ink-400">4–8 игроков</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-400">
        Видео идет напрямую между игроками (WebRTC). Комфортно для 4–6 человек.
      </p>
    </main>
  );
}
