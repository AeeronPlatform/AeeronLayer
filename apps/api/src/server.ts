import http from 'http';
  import { WebSocketServer } from 'ws';
  import { app }    from './app';
  import { WsHub }  from './events/WsHub';
  import { logger } from './logger';

  const PORT = parseInt(process.env.PORT ?? '5000', 10);

  const server = http.createServer(app);
  const wss    = new WebSocketServer({ server, path: '/v1/events' });
  export const wsHub = new WsHub(wss);

  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'Aeeron Gateway listening');
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down');
    wsHub.destroy();
    server.close(() => process.exit(0));
  });
  