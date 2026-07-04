import type { RoleName, Team } from './types';

export const ROLE_INFO: Record<
  RoleName,
  { title: string; team: Team; teamLabel: string; description: string }
> = {
  civilian: {
    title: 'Мирный житель',
    team: 'civilians',
    teamLabel: 'Мирные',
    description:
      'Твоя задача — найти мафию и помочь мирным победить. У тебя нет ночного действия.',
  },
  mafia: {
    title: 'Мафия',
    team: 'mafia',
    teamLabel: 'Мафия',
    description:
      'Твоя задача — убрать мирных жителей и не раскрыться. Ночью мафия выбирает жертву.',
  },
  don: {
    title: 'Дон мафии',
    team: 'mafia',
    teamLabel: 'Мафия',
    description:
      'Ты руководишь мафией. Ночью мафия выбирает жертву — последнее слово за тобой. Для проверки комиссара ты выглядишь как мирный житель.',
  },
  maniac: {
    title: 'Маньяк',
    team: 'maniac',
    teamLabel: 'Одиночка',
    description:
      'Ты играешь сам за себя. Каждую ночь убиваешь одного игрока. Побеждаешь, если останешься последним.',
  },
  commissioner: {
    title: 'Комиссар',
    team: 'civilians',
    teamLabel: 'Мирные',
    description:
      'Твоя задача — искать мафию. Ночью ты можешь проверить одного игрока.',
  },
  doctor: {
    title: 'Доктор',
    team: 'civilians',
    teamLabel: 'Мирные',
    description:
      'Твоя задача — спасать игроков. Ночью ты можешь выбрать одного игрока для лечения.',
  },
};

export const PHASE_LABELS: Record<string, string> = {
  lobby: 'Лобби',
  role_reveal: 'Показ ролей',
  night: 'Ночь',
  day: 'День',
  voting: 'Голосование',
  elimination_result: 'Результат голосования',
  finished: 'Игра завершена',
};

export const WINNER_LABELS: Record<string, string> = {
  civilians: 'Победа мирных',
  mafia: 'Победа мафии',
  maniac: 'Победа маньяка',
  none: 'Без победителя',
};
