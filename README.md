# Mafia Rooms

Online rooms for the Mafia party game with video and voice over WebRTC, roles, game phases, timers and voting. The host runs the game, and the site handles the routine. No sign-up and no paid services.

## Features

- Create a room and share an invite link. Players join with a nickname.
- Video and voice chat between all players (WebRTC mesh).
- Role setup (Mafia, Detective, Doctor) and timer settings in the lobby.
- Each player sees only their own role. The host can reveal all roles in the host panel.
- Phases: night → day → voting, with discussion and speech timers.
- Voting: living players pick a candidate, the host closes the vote and confirms the elimination.
- Results screen with everyone's roles at the end of the game.

## Tech stack

- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- Custom Node.js server with Socket.IO (realtime game state and WebRTC signaling)
- Native WebRTC (mesh, STUN only)
- Zustand (client state)
- In-memory storage (rooms live while the server is running)

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Production build:

```bash
npm run build
npm start
```

## How to play

1. Enter a nickname on the home page and click "Create room".
2. Copy the link from the lobby and send it to friends.
3. Friends open the link, enter a nickname and allow camera and microphone access.
4. The host sets up roles and timers and clicks "Start game".
5. The host moves the game through phases. At night the host marks who was killed (if the Doctor saved them, nobody is marked). During the day there are discussion and speech timers.
6. Voting: living players choose a candidate, the host ends the vote and confirms the elimination.
7. The host ends the game by choosing the winning side, and everyone sees the results screen.

## Testing locally

One camera can't be shared between tabs of the same browser, so use different browsers or devices: Chrome, Firefox, a phone, an incognito window or a second laptop.

## Playing with friends over the internet

Browsers allow camera and microphone only over HTTPS (or on localhost), so use a tunnel, for example Cloudflare Tunnel:

```bash
npm run dev
cloudflared tunnel --url http://localhost:3000
```

You'll get an HTTPS link like `https://xxx.trycloudflare.com`. Create a room there and share the invite link.

## MVP limitations

- WebRTC mesh works best with 4–6 players, 8 at most.
- No TURN server, so video may not connect on some corporate or mobile networks.
- Rooms are stored in memory and disappear when the server restarts.
- Night actions of the Mafia, Detective and Doctor are handled by the host by voice. The site only shows statuses.
- The host picks the winner manually.

## Project structure

```text
server/
  index.ts               # custom Next.js server + Socket.IO
  socket.ts              # Socket.IO events: rooms, game, timers, voting, signaling
  rooms/room.manager.ts  # in-memory room state and game logic
  game/role.service.ts   # role generation and validation
src/
  shared/types.ts        # types shared by client and server
  shared/roles.ts        # role and phase texts
  lib/socket.ts          # Socket.IO client singleton
  lib/store.ts           # Zustand store
  lib/webrtc.ts          # PeerManager: WebRTC mesh
  app/                   # pages: home, /room/[roomId]
  features/
    room/                # PreJoin, Lobby, SettingsPanel, RoomClient
    game/                # GameView, RoleCard, HostPanel, Results
    voting/              # VotePanel
    video/               # VideoGrid, VideoTile, MediaBar
    timer/               # TimerDisplay
```
