import type { PlayerRole, RoleName, RoomSettings } from '../../src/shared/types';
import { GameError } from '../rooms/room.manager';

export function validateRoleSetup(playerCount: number, settings: RoomSettings) {
  if (playerCount < settings.minPlayers) {
    throw new GameError(
      `Недостаточно игроков для старта: нужно минимум ${settings.minPlayers}, сейчас ${playerCount}`,
    );
  }
  if (playerCount > settings.maxPlayers) {
    throw new GameError('Игроков больше, чем максимум комнаты');
  }
  if (settings.mafiaCount < 1) {
    throw new GameError('Должна быть хотя бы одна мафия');
  }
  // The don is one of the mafiaCount slots, so he adds no extra special.
  const specials =
    settings.mafiaCount +
    (settings.hasCommissioner ? 1 : 0) +
    (settings.hasDoctor ? 1 : 0) +
    (settings.hasManiac ? 1 : 0);
  if (specials > playerCount) {
    throw new GameError('Специальных ролей больше, чем игроков');
  }
  const nonMafia = playerCount - settings.mafiaCount;
  if (settings.mafiaCount >= nonMafia) {
    throw new GameError('Мафии должно быть меньше, чем мирных на старте');
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function teamOf(role: RoleName): PlayerRole['team'] {
  if (role === 'mafia' || role === 'don') return 'mafia';
  if (role === 'maniac') return 'maniac';
  return 'civilians';
}

export function generateRoles(
  playerIds: string[],
  settings: RoomSettings,
): Map<string, PlayerRole> {
  const rolePool: RoleName[] = [];
  // The don takes one of the mafia slots.
  if (settings.hasDon) rolePool.push('don');
  for (let i = rolePool.length; i < settings.mafiaCount; i++) rolePool.push('mafia');
  if (settings.hasCommissioner) rolePool.push('commissioner');
  if (settings.hasDoctor) rolePool.push('doctor');
  if (settings.hasManiac) rolePool.push('maniac');
  while (rolePool.length < playerIds.length) rolePool.push('civilian');

  const shuffled = shuffle(rolePool);
  const roles = new Map<string, PlayerRole>();
  playerIds.forEach((playerId, i) => {
    const role = shuffled[i];
    roles.set(playerId, { playerId, role, team: teamOf(role) });
  });
  return roles;
}
