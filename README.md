# Mafia Rooms

Онлайн-комнаты для игры в «Мафию»: видео/голос через WebRTC mesh, роли, фазы, таймеры и голосование. Хост ведет партию, сайт автоматизирует рутину. Без регистрации и платных сервисов.

## Стек

- Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- Custom Node.js server + Socket.IO (realtime + WebRTC signaling)
- Native WebRTC (mesh, STUN only, без TURN)
- Zustand (клиентское состояние)
- In-memory storage (комнаты живут, пока работает сервер)

## Запуск

```bash
npm install
npm run dev
```

Открыть <http://localhost:3000>.

Продакшен-сборка:

```bash
npm run build
npm start
```

## Как играть

1. На главной введи никнейм и нажми «Создать комнату».
2. Скопируй ссылку в лобби и отправь друзьям.
3. Друзья заходят по ссылке, указывают никнейм, разрешают камеру/микрофон.
4. Хост настраивает роли (мафия, комиссар, доктор) и таймеры, жмет «Начать игру».
5. Каждый видит только свою роль. Хост видит все роли (панель ведущего → «Показать роли»).
6. Хост ведет фазы: ночь → день → голосование. Ночью хост вручную отмечает убитого
   (если доктор спас — просто не убивает). Днем — таймеры обсуждения и речи.
7. Голосование: живые выбирают кандидата, хост завершает и подтверждает изгнание.
8. Хост завершает игру выбором победителя — всем показывается экран результата с ролями.

## Тест локально

Одна камера конфликтует между вкладками одного браузера, поэтому:

- игрок 1 — Chrome, игрок 2 — Firefox, игрок 3 — телефон, игрок 4 — инкогнито/второй ноутбук.

## Тест с друзьями через интернет (Cloudflare Tunnel)

Камера/микрофон в браузере требуют HTTPS (или localhost), поэтому нужен туннель:

```bash
npm run dev
cloudflared tunnel --url http://localhost:3000
```

Получишь HTTPS-ссылку вида `https://xxx.trycloudflare.com` — создай комнату и раздай invite-link.

## Ограничения MVP

- WebRTC mesh: комфортно 4–6 игроков, максимум 8.
- Нет TURN-сервера: в некоторых корпоративных/мобильных сетях видео может не соединиться.
- Комнаты в памяти: рестарт сервера удаляет комнаты.
- Ночные действия мафии/комиссара/доктора хост ведет вручную (голосом), сайт помогает статусами.
- Победа выбирается хостом вручную.

## Структура

```text
server/
  index.ts               # custom Next.js server + Socket.IO
  socket.ts              # все Socket.IO события (комнаты, игра, таймеры, голосование, signaling)
  rooms/room.manager.ts  # in-memory состояние комнат, вся игровая логика
  game/role.service.ts   # генерация и валидация ролей
src/
  shared/types.ts        # общие типы клиент/сервер
  shared/roles.ts        # тексты ролей и фаз
  lib/socket.ts          # Socket.IO client singleton
  lib/store.ts           # Zustand store
  lib/webrtc.ts          # PeerManager: WebRTC mesh
  app/                   # страницы: главная, /room/[roomId]
  features/
    room/                # PreJoin, Lobby, SettingsPanel, RoomClient
    game/                # GameView, RoleCard, HostPanel, Results
    voting/              # VotePanel
    video/               # VideoGrid, VideoTile, MediaBar
    timer/               # TimerDisplay
```
