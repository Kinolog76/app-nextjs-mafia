import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket';

const dev = !process.argv.includes('--prod');
const port = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Mafia Rooms: http://localhost:${port} (${dev ? 'dev' : 'production'})`);
  });
});
