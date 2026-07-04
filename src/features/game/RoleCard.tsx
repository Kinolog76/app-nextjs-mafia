'use client';

import { useRoomStore } from '@/lib/store';
import { ROLE_INFO } from '@/shared/roles';
import { RoleIcon } from '@/shared/ui/icons';

export default function RoleCard() {
  const role = useRoomStore((s) => s.role);
  const setRoleAcknowledged = useRoomStore((s) => s.setRoleAcknowledged);

  if (!role) return null;
  const info = ROLE_INFO[role.role];
  const accent =
    role.team === 'mafia'
      ? 'var(--color-blood-500)'
      : role.team === 'maniac'
        ? 'var(--color-violet-500, #8b5cf6)'
        : 'var(--color-brass-500)';

  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
      <div
        className="anim-card-reveal relative w-full max-w-md overflow-hidden rounded-3xl border-2 p-8 text-center"
        style={{
          borderColor: accent,
          background:
            'linear-gradient(180deg, var(--color-ink-850), var(--color-ink-950))',
          boxShadow: `0 0 60px color-mix(in srgb, ${accent} 28%, transparent)`,
        }}
      >
        {/* Deco corners */}
        <div className="pointer-events-none absolute inset-3 rounded-2xl border border-ink-700" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />

        <div className="relative">
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2"
            style={{ borderColor: accent, color: accent }}
          >
            <RoleIcon role={role.role} size={44} />
          </div>

          <div className="font-display mt-5 text-[10px] font-bold uppercase tracking-[0.35em] text-ink-400">
            Твоя роль
          </div>
          <h2 className="font-display mt-1 text-3xl font-black text-white">{info.title}</h2>
          <p
            className="font-display mt-2 text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: accent }}
          >
            Команда · {info.teamLabel}
          </p>

          <p className="mt-5 text-balance text-ink-300">{info.description}</p>
          <p className="mt-3 text-xs text-ink-400">Никому не показывай эту карточку.</p>

          <button
            className="btn-primary mt-7 w-full py-3"
            onClick={() => setRoleAcknowledged(true)}
          >
            Понял
          </button>
        </div>
      </div>
    </div>
  );
}
