'use client';

import { useState } from 'react';
import { emitWithAck } from '@/lib/socket';
import { useRoomStore } from '@/lib/store';
import type { RoomSettings } from '@/shared/types';
import {
  CivilianIcon,
  DetectiveIcon,
  DoctorCrossIcon,
  DonIcon,
  FedoraIcon,
  ManiacIcon,
  XIcon,
} from '@/shared/ui/icons';

/* ---------- Small controls ---------- */

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-on={checked}
      className="toggle disabled:opacity-40"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
  step = 1,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-ink-300 transition-colors hover:border-ink-400 hover:text-white disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="font-display min-w-12 text-center text-sm tabular-nums text-white">
        {value}
        {suffix && <span className="ml-0.5 text-[10px] text-ink-400">{suffix}</span>}
      </span>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-ink-300 transition-colors hover:border-ink-400 hover:text-white disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        +
      </button>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm text-ink-200">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-400">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display mb-1 border-b border-ink-700 pb-2 text-xs font-bold uppercase tracking-[0.2em] text-brass-500">
        {title}
      </h3>
      <div className="divide-y divide-ink-800">{children}</div>
    </section>
  );
}

/* ---------- Role composition preview ---------- */

function RoleComposition({ settings, playerCount }: { settings: RoomSettings; playerCount: number }) {
  const specials =
    settings.mafiaCount +
    (settings.hasCommissioner ? 1 : 0) +
    (settings.hasDoctor ? 1 : 0) +
    (settings.hasManiac ? 1 : 0);
  const basis = Math.max(playerCount, settings.minPlayers);
  const civilians = Math.max(0, basis - specials);
  const plainMafia = settings.hasDon ? settings.mafiaCount - 1 : settings.mafiaCount;
  const invalid = settings.mafiaCount >= basis - settings.mafiaCount || specials > basis;

  const chip = (icon: React.ReactNode, label: string, count: number, cls: string) => (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${cls}`}>
      {icon}
      <span className="text-xs">{label}</span>
      <span className="font-display ml-auto text-sm font-bold tabular-nums">{count}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">
          Расклад на {basis} игроков
        </span>
        {playerCount < settings.minPlayers && (
          <span className="text-[11px] text-ink-400">сейчас в комнате: {playerCount}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {chip(
          <FedoraIcon size={16} className="text-blood-400" />,
          'Мафия',
          plainMafia,
          'border-blood-700/50 bg-blood-700/10 text-blood-400',
        )}
        {settings.hasDon &&
          chip(
            <DonIcon size={16} className="text-blood-400" />,
            'Дон',
            1,
            'border-blood-700/50 bg-blood-700/10 text-blood-400',
          )}
        {settings.hasManiac &&
          chip(
            <ManiacIcon size={16} className="text-violet-400" />,
            'Маньяк',
            1,
            'border-violet-700/50 bg-violet-700/10 text-violet-400',
          )}
        {chip(
          <DetectiveIcon size={16} className="text-brass-400" />,
          'Комиссар',
          settings.hasCommissioner ? 1 : 0,
          'border-brass-600/40 bg-brass-600/10 text-brass-400',
        )}
        {chip(
          <DoctorCrossIcon size={16} className="text-verdant-400" />,
          'Доктор',
          settings.hasDoctor ? 1 : 0,
          'border-verdant-500/40 bg-verdant-500/10 text-verdant-400',
        )}
        {chip(
          <CivilianIcon size={16} className="text-ink-300" />,
          'Мирные',
          civilians,
          'border-ink-600 bg-ink-800/60 text-ink-300',
        )}
      </div>
      {invalid && (
        <p className="mt-2 text-xs text-blood-400">
          Мафии должно быть меньше, чем остальных игроков.
        </p>
      )}
    </div>
  );
}

/* ---------- Main panel ---------- */

export default function SettingsPanel({
  roomId,
  onClose,
}: {
  roomId: string;
  onClose: () => void;
}) {
  const room = useRoomStore((s) => s.room);
  const selfId = useRoomStore((s) => s.selfId);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'roles' | 'rules' | 'timers'>('roles');

  if (!room || !selfId) return null;
  const s = room.settings;

  const update = async (patch: Partial<RoomSettings>) => {
    setError(null);
    try {
      await emitWithAck('room:update-settings', { roomId, playerId: selfId, settings: patch });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления настроек');
    }
  };

  const tabs = [
    { id: 'roles' as const, label: 'Роли' },
    { id: 'rules' as const, label: 'Правила' },
    { id: 'timers' as const, label: 'Таймеры' },
  ];

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card anim-fade-up flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden !p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <h2 className="font-display text-base font-bold text-white">Настройки игры</h2>
          <button className="btn-ghost !p-2" onClick={onClose} title="Закрыть">
            <XIcon size={16} />
          </button>
        </header>

        <div className="flex gap-1 border-b border-ink-700 px-5 pt-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'border border-b-0 border-ink-600 bg-ink-800 text-white'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {tab === 'roles' && (
            <>
              <RoleComposition settings={s} playerCount={room.players.length} />
              <Section title="Состав ролей">
                <Row label="Мафия" hint="Ночью выбирает жертву">
                  <Stepper
                    value={s.mafiaCount}
                    min={1}
                    max={5}
                    onChange={(v) => update({ mafiaCount: v })}
                  />
                </Row>
                <Row label="Дон мафии" hint="Входит в число мафии, для комиссара выглядит мирным">
                  <Toggle checked={s.hasDon} onChange={(v) => update({ hasDon: v })} />
                </Row>
                <Row label="Маньяк" hint="Одиночка: убивает по ночам сам за себя">
                  <Toggle checked={s.hasManiac} onChange={(v) => update({ hasManiac: v })} />
                </Row>
                <Row label="Комиссар" hint="Ночью проверяет одного игрока">
                  <Toggle
                    checked={s.hasCommissioner}
                    onChange={(v) => update({ hasCommissioner: v })}
                  />
                </Row>
                <Row label="Доктор" hint="Ночью может спасти одного игрока">
                  <Toggle checked={s.hasDoctor} onChange={(v) => update({ hasDoctor: v })} />
                </Row>
              </Section>
              <Section title="Комната">
                <Row label="Название комнаты">
                  <input
                    className="input !w-44"
                    defaultValue={s.title}
                    maxLength={40}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== s.title) update({ title: v });
                    }}
                  />
                </Row>
                <Row label="Минимум игроков">
                  <Stepper
                    value={s.minPlayers}
                    min={3}
                    max={12}
                    onChange={(v) => update({ minPlayers: v })}
                  />
                </Row>
                <Row label="Максимум игроков" hint="Комфортно 4–6, максимум 12 (WebRTC mesh)">
                  <Stepper
                    value={s.maxPlayers}
                    min={3}
                    max={12}
                    onChange={(v) => update({ maxPlayers: v })}
                  />
                </Row>
              </Section>
            </>
          )}

          {tab === 'rules' && (
            <>
              <Section title="Мертвые игроки">
                <Row label="Показывать роль умершего" hint="Все увидят роль убитого или выгнанного">
                  <Toggle
                    checked={s.revealDeadRole}
                    onChange={(v) => update({ revealDeadRole: v })}
                  />
                </Row>
                <Row label="Мертвые могут говорить">
                  <Toggle
                    checked={s.allowDeadToSpeak}
                    onChange={(v) => update({ allowDeadToSpeak: v })}
                  />
                </Row>
                <Row label="Авто-выключение микрофона" hint="Микрофон умершего выключается сам">
                  <Toggle checked={s.autoMuteDead} onChange={(v) => update({ autoMuteDead: v })} />
                </Row>
                <Row label="Затемнять камеру мертвого">
                  <Toggle checked={s.dimDeadVideo} onChange={(v) => update({ dimDeadVideo: v })} />
                </Row>
                <Row label="Скрывать камеру мертвого" hint="Вместо затемнения — полностью скрыть">
                  <Toggle
                    checked={s.hideDeadVideo}
                    onChange={(v) => update({ hideDeadVideo: v })}
                  />
                </Row>
              </Section>
              <Section title="Голосование">
                <Row label="Можно голосовать за себя">
                  <Toggle checked={s.allowSelfVote} onChange={(v) => update({ allowSelfVote: v })} />
                </Row>
                <Row label="Можно менять голос" hint="До конца голосования">
                  <Toggle
                    checked={s.allowVoteChange}
                    onChange={(v) => update({ allowVoteChange: v })}
                  />
                </Row>
              </Section>
              <Section title="Прочее">
                <Row label="Анонимный режим" hint="Только никнеймы, без лишних данных">
                  <Toggle
                    checked={s.anonymousMode}
                    onChange={(v) => update({ anonymousMode: v })}
                  />
                </Row>
              </Section>
            </>
          )}

          {tab === 'timers' && (
            <Section title="Длительность фаз">
              <Row label="Показ роли">
                <Stepper
                  value={s.roleRevealSeconds}
                  min={5}
                  max={120}
                  step={5}
                  suffix="с"
                  onChange={(v) => update({ roleRevealSeconds: v })}
                />
              </Row>
              <Row label="Ночь">
                <Stepper
                  value={s.nightSeconds}
                  min={10}
                  max={600}
                  step={10}
                  suffix="с"
                  onChange={(v) => update({ nightSeconds: v })}
                />
              </Row>
              <Row label="Дневное обсуждение">
                <Stepper
                  value={s.dayDiscussionSeconds}
                  min={30}
                  max={1800}
                  step={30}
                  suffix="с"
                  onChange={(v) => update({ dayDiscussionSeconds: v })}
                />
              </Row>
              <Row label="Речь игрока">
                <Stepper
                  value={s.playerSpeechSeconds}
                  min={10}
                  max={300}
                  step={10}
                  suffix="с"
                  onChange={(v) => update({ playerSpeechSeconds: v })}
                />
              </Row>
              <Row label="Голосование">
                <Stepper
                  value={s.votingSeconds}
                  min={10}
                  max={300}
                  step={5}
                  suffix="с"
                  onChange={(v) => update({ votingSeconds: v })}
                />
              </Row>
            </Section>
          )}

          {error && <p className="text-sm text-blood-400">{error}</p>}
        </div>

        <footer className="border-t border-ink-700 px-5 py-3">
          <button className="btn-primary w-full" onClick={onClose}>
            Готово
          </button>
        </footer>
      </div>
    </div>
  );
}
