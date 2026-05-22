import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { getInternalToken, getSocketAllowedOrigins } from './src/lib/runtime-config';
import { boardRoom } from './src/lib/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const internalToken = getInternalToken();
  const allowedOrigins = getSocketAllowedOrigins();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '', true);

    if (req.method === 'POST' && parsedUrl.pathname === '/internal/socket-event') {
      if (req.headers['x-internal-token'] !== internalToken) {
        res.statusCode = 401;
        res.end('Unauthorized');
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', () => {
        try {
          const { boardId, event, payload } = JSON.parse(body) as {
            boardId: number;
            event: string;
            payload: Record<string, unknown>;
          };
          io.to(boardRoom(boardId)).emit(event, payload);
          res.statusCode = 204;
          res.end();
        } catch (error) {
          console.error('[socket bridge] failed to emit', error);
          res.statusCode = 400;
          res.end('Bad Request');
        }
      });
      return;
    }

    handle(req, res, parsedUrl);
  });
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on('join_board', (boardId: number) => {
      const room = boardRoom(boardId);
      socket.join(room);
      console.log(`[socket] ${socket.id} joined ${room}`);
    });

    socket.on('leave_board', (boardId: number) => {
      const room = boardRoom(boardId);
      socket.leave(room);
      console.log(`[socket] ${socket.id} left ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  httpServer
    .once('error', (error) => {
      console.error(error);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
